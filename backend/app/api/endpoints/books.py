from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import cache_get, cache_set
from app.core.database import get_db
from app.core.security import get_current_user, get_optional_user
from app.models.models import Book, UserBookRating
from app.schemas.schemas import (
    BookOut,
    BookRecommendation,
    UserBookRatingCreate,
    UserBookRatingOut,
)
from app.services.book_service import book_recommender, search_google_books, get_google_book_by_id

router = APIRouter()


@router.get("/search", response_model=List[BookRecommendation])
async def search_books(
    q: str = Query(..., min_length=1),
    limit: int = Query(20, ge=1, le=50),
):
    cache_key = f"book_search:{q}:{limit}"
    cached = await cache_get(cache_key)
    if cached:
        return cached

    results = await search_google_books(q, limit)
    if results:
        await cache_set(cache_key, [r.model_dump() for r in results], ttl=3600)
    return results


@router.get("/recommendations", response_model=List[BookRecommendation])
async def get_book_recommendations(
    top_n: int = Query(10, ge=1, le=50),
    alpha: float = Query(0.5, ge=0.0, le=1.0),
    time_decay: bool = Query(True),
    current_user=Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    if not current_user:
        # Return popular books via Google Books
        cached = await cache_get("popular_books")
        if cached:
            return cached
        popular = await search_google_books("bestseller fiction", top_n)
        await cache_set("popular_books", [r.model_dump() for r in popular], ttl=86400)
        return popular

    cache_key = f"recs:books:{current_user.id}:{top_n}:{alpha}:{time_decay}"
    cached = await cache_get(cache_key)
    if cached:
        return cached

    result = await db.execute(
        select(UserBookRating).where(UserBookRating.user_id == current_user.id)
    )
    ratings = result.scalars().all()

    history_ids = [r.book_id for r in ratings]
    goodreads_ids = []
    for rating in ratings:
        book_result = await db.execute(select(Book).where(Book.id == rating.book_id))
        book = book_result.scalar_one_or_none()
        if book and book.goodreads_id:
            goodreads_ids.append(book.goodreads_id)

    recs = []
    if goodreads_ids and book_recommender.is_loaded:
        recs = book_recommender.recommend_for_user(
            goodreads_user_id=-1,
            history_book_ids=goodreads_ids,
            top_n=top_n,
            alpha=alpha,
            use_time_decay=time_decay,
        )

    if not recs:
        recs = await search_google_books("popular books", top_n)

    await cache_set(cache_key, [r.model_dump() for r in recs], ttl=1800)
    return recs


@router.get("/google/{google_books_id}", response_model=BookRecommendation)
async def get_google_book(google_books_id: str):
    book = await get_google_book_by_id(google_books_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found on Google Books")
    return book


@router.get("/{book_id}", response_model=BookOut)
async def get_book(book_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Book).where(Book.id == book_id))
    book = result.scalar_one_or_none()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    return book


@router.post("/{book_id}/rate", response_model=UserBookRatingOut)
async def rate_book(
    book_id: int,
    payload: UserBookRatingCreate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    book_result = await db.execute(select(Book).where(Book.id == book_id))
    if not book_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Book not found")

    result = await db.execute(
        select(UserBookRating).where(
            UserBookRating.user_id == current_user.id,
            UserBookRating.book_id == book_id,
        )
    )
    rating = result.scalar_one_or_none()
    if rating:
        rating.rating = payload.rating
        rating.status = payload.status
    else:
        rating = UserBookRating(
            user_id=current_user.id,
            book_id=book_id,
            rating=payload.rating,
            status=payload.status,
        )
        db.add(rating)
    await db.flush()
    return rating


@router.get("/user/library", response_model=List[UserBookRatingOut])
async def get_user_library(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UserBookRating).where(UserBookRating.user_id == current_user.id)
    )
    return result.scalars().all()


@router.post("/import", response_model=BookOut, status_code=201)
async def import_book(
    google_books_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Import a book from Google Books into local DB (called when user rates/saves a search result)."""
    existing = await db.execute(select(Book).where(Book.google_books_id == google_books_id))
    book = existing.scalar_one_or_none()
    if book:
        return book

    results = await search_google_books(f"id:{google_books_id}", 1)
    if not results:
        raise HTTPException(status_code=404, detail="Book not found on Google Books")

    r = results[0]
    book = Book(
        google_books_id=google_books_id,
        title=r.title,
        authors=r.authors,
        description=r.description,
        cover_url=r.cover_url,
        published_year=r.published_year,
        genres=r.genres,
        average_rating=r.average_rating,
    )
    db.add(book)
    await db.flush()
    return book
