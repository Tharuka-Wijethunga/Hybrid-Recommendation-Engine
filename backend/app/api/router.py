from fastapi import APIRouter

from app.api.endpoints import auth, books, music, reviews, users

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(books.router, prefix="/books", tags=["books"])
api_router.include_router(music.router, prefix="/music", tags=["music"])
api_router.include_router(reviews.router, prefix="/reviews", tags=["reviews"])
