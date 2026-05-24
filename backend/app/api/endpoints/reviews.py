from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import Review, User
from app.schemas.schemas import ReviewCreate, ReviewOut, ReviewUpdate

router = APIRouter()


@router.get("/", response_model=List[ReviewOut])
async def list_reviews(
    content_type: Optional[str] = Query(None, pattern=r"^(book|song)$"),
    content_id: Optional[int] = None,
    user_id: Optional[int] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    query = select(Review).options(selectinload(Review.user))
    if content_type:
        query = query.where(Review.content_type == content_type)
    if content_id:
        query = query.where(Review.content_id == content_id)
    if user_id:
        query = query.where(Review.user_id == user_id)

    query = query.order_by(Review.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=ReviewOut, status_code=201)
async def create_review(
    payload: ReviewCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    review = Review(
        user_id=current_user.id,
        content_type=payload.content_type,
        content_id=payload.content_id,
        body=payload.body,
        rating=payload.rating,
        contains_spoilers=payload.contains_spoilers,
    )
    db.add(review)
    await db.flush()

    result = await db.execute(
        select(Review).options(selectinload(Review.user)).where(Review.id == review.id)
    )
    return result.scalar_one()


@router.get("/{review_id}", response_model=ReviewOut)
async def get_review(review_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Review).options(selectinload(Review.user)).where(Review.id == review_id)
    )
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    return review


@router.patch("/{review_id}", response_model=ReviewOut)
async def update_review(
    review_id: int,
    payload: ReviewUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Review).options(selectinload(Review.user)).where(Review.id == review_id)
    )
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    if review.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your review")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(review, field, value)
    await db.flush()
    return review


@router.delete("/{review_id}", status_code=204)
async def delete_review(
    review_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Review).where(Review.id == review_id))
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    if review.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your review")
    await db.delete(review)
