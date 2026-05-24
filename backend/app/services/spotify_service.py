"""
Spotify Web API service.
Handles OAuth token management, search, audio features, and recommendations.
"""
import base64
import logging
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from urllib.parse import urlencode

import httpx

from app.core.config import settings
from app.schemas.schemas import SpotifyTrack, SongRecommendation

logger = logging.getLogger(__name__)

SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize"
SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token"
SPOTIFY_API_BASE = "https://api.spotify.com/v1"

SCOPES = [
    "user-read-private",
    "user-read-email",
    "user-top-read",
    "user-library-read",
    "user-library-modify",
    "playlist-read-private",
]

_client_token: Optional[str] = None
_client_token_expires_at: Optional[datetime] = None


def build_auth_url(state: str) -> str:
    params = {
        "client_id": settings.SPOTIFY_CLIENT_ID,
        "response_type": "code",
        "redirect_uri": settings.SPOTIFY_REDIRECT_URI,
        "scope": " ".join(SCOPES),
        "state": state,
        "show_dialog": "false",
    }
    return f"{SPOTIFY_AUTH_URL}?{urlencode(params)}"


async def exchange_code(code: str) -> dict:
    credentials = base64.b64encode(
        f"{settings.SPOTIFY_CLIENT_ID}:{settings.SPOTIFY_CLIENT_SECRET}".encode()
    ).decode()
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            SPOTIFY_TOKEN_URL,
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": settings.SPOTIFY_REDIRECT_URI,
            },
            headers={"Authorization": f"Basic {credentials}"},
        )
        resp.raise_for_status()
        return resp.json()


async def refresh_user_token(refresh_token: str) -> dict:
    credentials = base64.b64encode(
        f"{settings.SPOTIFY_CLIENT_ID}:{settings.SPOTIFY_CLIENT_SECRET}".encode()
    ).decode()
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            SPOTIFY_TOKEN_URL,
            data={"grant_type": "refresh_token", "refresh_token": refresh_token},
            headers={"Authorization": f"Basic {credentials}"},
        )
        resp.raise_for_status()
        return resp.json()


async def _get_client_token() -> str:
    global _client_token, _client_token_expires_at
    now = datetime.now(timezone.utc)
    if _client_token and _client_token_expires_at and now < _client_token_expires_at:
        return _client_token

    credentials = base64.b64encode(
        f"{settings.SPOTIFY_CLIENT_ID}:{settings.SPOTIFY_CLIENT_SECRET}".encode()
    ).decode()
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            SPOTIFY_TOKEN_URL,
            data={"grant_type": "client_credentials"},
            headers={"Authorization": f"Basic {credentials}"},
        )
        resp.raise_for_status()
        data = resp.json()
        _client_token = data["access_token"]
        _client_token_expires_at = now + timedelta(seconds=data["expires_in"] - 60)
        return _client_token


async def _api_get(endpoint: str, token: str, params: dict = None) -> dict:
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{SPOTIFY_API_BASE}{endpoint}",
            headers={"Authorization": f"Bearer {token}"},
            params=params or {},
        )
        resp.raise_for_status()
        return resp.json()


def _parse_track(track: dict) -> SpotifyTrack:
    artists = ", ".join(a["name"] for a in track.get("artists", []))
    album = track.get("album", {})
    images = album.get("images", [])
    cover = images[0]["url"] if images else None
    return SpotifyTrack(
        spotify_id=track["id"],
        title=track["name"],
        artist=artists,
        album=album.get("name"),
        cover_url=cover,
        preview_url=track.get("preview_url"),
        spotify_url=track.get("external_urls", {}).get("spotify"),
        duration_ms=track.get("duration_ms"),
    )


async def search_tracks(query: str, limit: int = 20, user_token: Optional[str] = None) -> List[SpotifyTrack]:
    token = user_token or await _get_client_token()
    try:
        data = await _api_get("/search", token, {"q": query, "type": "track", "limit": limit})
        return [_parse_track(t) for t in data.get("tracks", {}).get("items", []) if t]
    except Exception:
        logger.exception("Spotify search failed")
        return []


async def get_track_audio_features(spotify_ids: List[str], user_token: Optional[str] = None) -> dict:
    if not spotify_ids:
        return {}
    token = user_token or await _get_client_token()
    try:
        data = await _api_get("/audio-features", token, {"ids": ",".join(spotify_ids[:100])})
        features = {}
        for f in data.get("audio_features") or []:
            if f:
                features[f["id"]] = {
                    "danceability": f.get("danceability"),
                    "energy": f.get("energy"),
                    "valence": f.get("valence"),
                    "tempo": f.get("tempo"),
                }
        return features
    except Exception:
        logger.exception("Failed to fetch audio features")
        return {}


async def get_user_top_tracks(user_token: str, limit: int = 20, time_range: str = "medium_term") -> List[SpotifyTrack]:
    try:
        data = await _api_get("/me/top/tracks", user_token, {"limit": limit, "time_range": time_range})
        return [_parse_track(t) for t in data.get("items", []) if t]
    except Exception:
        logger.exception("Failed to fetch user top tracks")
        return []


async def get_recommendations(
    seed_track_ids: List[str],
    seed_artist_ids: List[str] = None,
    seed_genres: List[str] = None,
    limit: int = 20,
    target_energy: Optional[float] = None,
    target_valence: Optional[float] = None,
    user_token: Optional[str] = None,
) -> List[SongRecommendation]:
    token = user_token or await _get_client_token()
    params: dict = {"limit": limit}
    if seed_track_ids:
        params["seed_tracks"] = ",".join(seed_track_ids[:5])
    if seed_artist_ids:
        params["seed_artists"] = ",".join(seed_artist_ids[:2])
    if seed_genres:
        params["seed_genres"] = ",".join(seed_genres[:2])
    if target_energy is not None:
        params["target_energy"] = round(target_energy, 2)
    if target_valence is not None:
        params["target_valence"] = round(target_valence, 2)

    try:
        data = await _api_get("/recommendations", token, params)
        results = []
        for t in data.get("tracks", []):
            track = _parse_track(t)
            results.append(
                SongRecommendation(
                    spotify_id=track.spotify_id,
                    title=track.title,
                    artist=track.artist,
                    album=track.album,
                    cover_url=track.cover_url,
                    preview_url=track.preview_url,
                    spotify_url=track.spotify_url,
                    score=1.0,
                )
            )
        return results
    except Exception:
        logger.exception("Spotify recommendations failed")
        return []


async def get_spotify_profile(user_token: str) -> dict:
    try:
        return await _api_get("/me", user_token)
    except Exception:
        logger.exception("Failed to fetch Spotify profile")
        return {}
