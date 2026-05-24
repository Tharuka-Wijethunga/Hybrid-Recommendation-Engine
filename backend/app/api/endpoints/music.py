from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import cache_get, cache_set
from app.core.database import get_db
from app.core.security import get_current_user, get_optional_user
from app.models.models import Song, User, UserSongRating
from app.schemas.schemas import (
    SongOut,
    SongRecommendation,
    SpotifyTrack,
    UserSongRatingCreate,
    UserSongRatingOut,
)
from app.services import spotify_service

router = APIRouter()


def _get_valid_spotify_token(user: Optional[User]) -> Optional[str]:
    if not user or not user.spotify_access_token:
        return None
    return user.spotify_access_token


@router.get("/search", response_model=List[SpotifyTrack])
async def search_music(
    q: str = Query(..., min_length=1),
    limit: int = Query(20, ge=1, le=50),
    current_user=Depends(get_optional_user),
):
    cache_key = f"music_search:{q}:{limit}"
    cached = await cache_get(cache_key)
    if cached:
        return cached

    token = _get_valid_spotify_token(current_user)
    results = await spotify_service.search_tracks(q, limit, user_token=token)
    if results:
        await cache_set(cache_key, [r.model_dump() for r in results], ttl=1800)
    return results


@router.get("/recommendations", response_model=List[SongRecommendation])
async def get_music_recommendations(
    top_n: int = Query(20, ge=1, le=50),
    mood: Optional[str] = Query(None, description="happy|sad|energetic|calm"),
    current_user=Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    cache_key = f"music_recs:{current_user.id if current_user else 'anon'}:{top_n}:{mood}"
    cached = await cache_get(cache_key)
    if cached:
        return cached

    token = _get_valid_spotify_token(current_user)
    recs: List[SongRecommendation] = []

    # Primary: user's top tracks from Spotify (most reliable, not deprecated)
    if token:
        top_tracks = await spotify_service.get_user_top_tracks(token, limit=top_n)
        if top_tracks:
            recs = [
                SongRecommendation(
                    spotify_id=t.spotify_id,
                    title=t.title,
                    artist=t.artist,
                    album=t.album,
                    cover_url=t.cover_url,
                    preview_url=t.preview_url,
                    spotify_url=t.spotify_url,
                    score=1.0,
                )
                for t in top_tracks
            ]

    # Fallback: search for popular tracks by mood/genre
    if not recs:
        mood_query = {
            "energetic": "top hits energetic",
            "happy": "top hits happy upbeat",
            "calm": "chill acoustic calm",
            "sad": "sad emotional ballad",
        }.get(mood or "", "top hits 2024")

        tracks = await spotify_service.search_tracks(mood_query, limit=top_n)
        recs = [
            SongRecommendation(
                spotify_id=t.spotify_id,
                title=t.title,
                artist=t.artist,
                album=t.album,
                cover_url=t.cover_url,
                preview_url=t.preview_url,
                spotify_url=t.spotify_url,
                score=0.8,
            )
            for t in tracks
        ]

    await cache_set(cache_key, [r.model_dump() for r in recs], ttl=900)
    return recs


@router.get("/{song_id}", response_model=SongOut)
async def get_song(song_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Song).where(Song.id == song_id))
    song = result.scalar_one_or_none()
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    return song


@router.post("/like", response_model=UserSongRatingOut, status_code=201)
async def like_song(
    spotify_id: str,
    payload: UserSongRatingCreate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    song_result = await db.execute(select(Song).where(Song.spotify_id == spotify_id))
    song = song_result.scalar_one_or_none()

    if not song:
        tracks = await spotify_service.search_tracks(f"spotify:track:{spotify_id}", limit=1)
        if not tracks:
            raise HTTPException(status_code=404, detail="Track not found on Spotify")
        t = tracks[0]
        features = await spotify_service.get_track_audio_features([spotify_id])
        f = features.get(spotify_id, {})
        song = Song(
            spotify_id=spotify_id,
            title=t.title,
            artist=t.artist,
            album=t.album,
            cover_url=t.cover_url,
            preview_url=t.preview_url,
            spotify_url=t.spotify_url,
            duration_ms=t.duration_ms,
            danceability=f.get("danceability"),
            energy=f.get("energy"),
            valence=f.get("valence"),
            tempo=f.get("tempo"),
        )
        db.add(song)
        await db.flush()

    existing = await db.execute(
        select(UserSongRating).where(
            UserSongRating.user_id == current_user.id,
            UserSongRating.song_id == song.id,
        )
    )
    rating = existing.scalar_one_or_none()
    if rating:
        rating.liked = payload.liked
        rating.rating = payload.rating
    else:
        rating = UserSongRating(
            user_id=current_user.id,
            song_id=song.id,
            liked=payload.liked,
            rating=payload.rating,
        )
        db.add(rating)
    await db.flush()
    return rating


@router.get("/user/liked", response_model=List[UserSongRatingOut])
async def get_liked_songs(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UserSongRating)
        .where(UserSongRating.user_id == current_user.id)
        .order_by(UserSongRating.created_at.desc())
    )
    return result.scalars().all()


def _mood_to_energy(mood: Optional[str]) -> Optional[float]:
    mapping = {"energetic": 0.8, "calm": 0.3, "happy": 0.65, "sad": 0.35}
    return mapping.get(mood) if mood else None


def _mood_to_valence(mood: Optional[str]) -> Optional[float]:
    mapping = {"happy": 0.8, "sad": 0.2, "energetic": 0.6, "calm": 0.5}
    return mapping.get(mood) if mood else None
