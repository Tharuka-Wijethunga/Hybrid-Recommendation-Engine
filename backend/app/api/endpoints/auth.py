import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.models.models import User
from app.schemas.schemas import (
    RefreshRequest,
    TokenResponse,
    UserLogin,
    UserMe,
    UserRegister,
)
from app.services import spotify_service
from app.core.config import settings

router = APIRouter()


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: UserRegister, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(
        select(User).where((User.email == payload.email) | (User.username == payload.username))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email or username already registered")

    user = User(
        email=payload.email,
        username=payload.username,
        hashed_password=hash_password(payload.password),
        display_name=payload.display_name or payload.username,
    )
    db.add(user)
    await db.flush()

    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
    )


@router.post("/login", response_model=TokenResponse)
async def login(payload: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    if not user or not user.hashed_password or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is inactive")

    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(payload: RefreshRequest, db: AsyncSession = Depends(get_db)):
    user_id = decode_token(payload.refresh_token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found")

    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
    )


@router.get("/me", response_model=UserMe)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


# ─── Spotify OAuth ────────────────────────────────────────────────────────────

@router.get("/spotify/login")
async def spotify_login():
    if not settings.SPOTIFY_CLIENT_ID:
        raise HTTPException(status_code=503, detail="Spotify integration not configured")
    state = secrets.token_urlsafe(16)
    return RedirectResponse(url=spotify_service.build_auth_url(state))


@router.post("/spotify/link-init")
async def spotify_link_init(current_user: User = Depends(get_current_user)):
    """Authenticated endpoint: returns the Spotify OAuth URL with the user's ID
    encoded in state so the callback can link Spotify to the existing account."""
    if not settings.SPOTIFY_CLIENT_ID:
        raise HTTPException(status_code=503, detail="Spotify integration not configured")
    state = f"link_{current_user.id}_{secrets.token_urlsafe(8)}"
    return {"url": spotify_service.build_auth_url(state)}


@router.get("/spotify/callback")
async def spotify_callback(
    code: str = Query(...),
    state: str = Query(default=""),
    db: AsyncSession = Depends(get_db),
):
    try:
        token_data = await spotify_service.exchange_code(code)
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to exchange Spotify code")

    access_token = token_data["access_token"]
    profile = await spotify_service.get_spotify_profile(access_token)
    spotify_id = profile.get("id")
    email = next(
        (e["value"] for e in profile.get("emails", []) if e.get("value")),
        None,
    )
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=token_data.get("expires_in", 3600))

    user = None

    # Link flow: state is "link_<user_id>_<nonce>"
    if state.startswith("link_"):
        try:
            user_id = int(state.split("_")[1])
            result = await db.execute(select(User).where(User.id == user_id))
            user = result.scalar_one_or_none()
        except (ValueError, IndexError):
            pass

    # New / sign-in flow: find by Spotify ID or email
    if user is None:
        result = await db.execute(select(User).where(User.spotify_id == spotify_id))
        user = result.scalar_one_or_none()

    if user is None and email:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

    if user is None:
        images = profile.get("images", [])
        user = User(
            email=email or f"{spotify_id}@spotify.placeholder",
            username=f"spotify_{spotify_id}",
            display_name=profile.get("display_name"),
            avatar_url=images[0]["url"] if images else None,
        )
        db.add(user)
        await db.flush()

    user.spotify_id = spotify_id
    user.spotify_access_token = access_token
    user.spotify_refresh_token = token_data.get("refresh_token", user.spotify_refresh_token)
    user.spotify_token_expires_at = expires_at

    our_token = create_access_token(str(user.id))
    refresh = create_refresh_token(str(user.id))

    redirect_url = (
        f"{settings.FRONTEND_URL}/auth/callback"
        f"?access_token={our_token}&refresh_token={refresh}"
    )
    return RedirectResponse(url=redirect_url)
