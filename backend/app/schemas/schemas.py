from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


# ─── Auth ────────────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_]+$")
    password: str = Field(min_length=8)
    display_name: Optional[str] = Field(None, max_length=100)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


# ─── User ────────────────────────────────────────────────────────────────────

class UserPublic(BaseModel):
    id: int
    username: str
    display_name: Optional[str]
    avatar_url: Optional[str]
    bio: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class UserMe(UserPublic):
    email: str
    spotify_id: Optional[str]


class UserUpdate(BaseModel):
    display_name: Optional[str] = Field(None, max_length=100)
    bio: Optional[str] = Field(None, max_length=500)
    avatar_url: Optional[str] = None


# ─── Book ────────────────────────────────────────────────────────────────────

class BookBase(BaseModel):
    title: str
    authors: Optional[str] = None
    description: Optional[str] = None
    cover_url: Optional[str] = None
    published_year: Optional[int] = None
    genres: Optional[str] = None
    average_rating: Optional[float] = None


class BookOut(BookBase):
    id: int
    google_books_id: Optional[str]
    goodreads_id: Optional[int]
    ratings_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class BookRecommendation(BaseModel):
    id: Optional[int] = None
    google_books_id: Optional[str] = None
    goodreads_id: Optional[int] = None
    title: str
    authors: Optional[str] = None
    cover_url: Optional[str] = None
    description: Optional[str] = None
    genres: Optional[str] = None
    score: float = 0.0
    source: str = "ml"  # "ml" | "google_books" | "popular"


class UserBookRatingOut(BaseModel):
    id: int
    book_id: int
    rating: Optional[int]
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class UserBookRatingCreate(BaseModel):
    rating: Optional[int] = Field(None, ge=1, le=5)
    status: str = Field("want_to_read", pattern=r"^(want_to_read|reading|read)$")


# ─── Song ────────────────────────────────────────────────────────────────────

class SongBase(BaseModel):
    spotify_id: str
    title: str
    artist: str
    album: Optional[str] = None
    cover_url: Optional[str] = None
    preview_url: Optional[str] = None
    spotify_url: Optional[str] = None
    duration_ms: Optional[int] = None
    danceability: Optional[float] = None
    energy: Optional[float] = None
    valence: Optional[float] = None
    tempo: Optional[float] = None


class SongOut(SongBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class SpotifyTrack(BaseModel):
    spotify_id: str
    title: str
    artist: str
    album: Optional[str] = None
    cover_url: Optional[str] = None
    preview_url: Optional[str] = None
    spotify_url: Optional[str] = None
    duration_ms: Optional[int] = None
    danceability: Optional[float] = None
    energy: Optional[float] = None
    valence: Optional[float] = None
    tempo: Optional[float] = None


class SongRecommendation(BaseModel):
    spotify_id: str
    title: str
    artist: str
    album: Optional[str] = None
    cover_url: Optional[str] = None
    preview_url: Optional[str] = None
    spotify_url: Optional[str] = None
    score: float = 0.0


class UserSongRatingCreate(BaseModel):
    liked: bool = True
    rating: Optional[int] = Field(None, ge=1, le=5)


class UserSongRatingOut(BaseModel):
    id: int
    song_id: int
    liked: bool
    rating: Optional[int]
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Review ──────────────────────────────────────────────────────────────────

class ReviewCreate(BaseModel):
    content_type: str = Field(pattern=r"^(book|song)$")
    content_id: int
    body: str = Field(min_length=10, max_length=5000)
    rating: Optional[int] = Field(None, ge=1, le=5)
    contains_spoilers: bool = False


class ReviewUpdate(BaseModel):
    body: Optional[str] = Field(None, min_length=10, max_length=5000)
    rating: Optional[int] = Field(None, ge=1, le=5)
    contains_spoilers: Optional[bool] = None


class ReviewOut(BaseModel):
    id: int
    user_id: int
    content_type: str
    content_id: int
    body: str
    rating: Optional[int]
    contains_spoilers: bool
    created_at: datetime
    updated_at: datetime
    user: UserPublic

    model_config = {"from_attributes": True}


# ─── Pagination ──────────────────────────────────────────────────────────────

class PaginatedResponse(BaseModel):
    items: list
    total: int
    page: int
    page_size: int
    has_next: bool
