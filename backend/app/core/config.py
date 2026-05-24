from pydantic_settings import BaseSettings
from typing import List
import json


class Settings(BaseSettings):
    # App
    APP_NAME: str = "ReadSound API"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://readsound_user:readsound_pass@localhost:5432/readsound_db"

    # Redis
    REDIS_URL: str = "redis://localhost:6379"

    # JWT
    SECRET_KEY: str = "change-me-in-production-use-a-long-random-string"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    # Spotify
    SPOTIFY_CLIENT_ID: str = ""
    SPOTIFY_CLIENT_SECRET: str = ""
    SPOTIFY_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/spotify/callback"

    # Google Books
    GOOGLE_BOOKS_API_KEY: str = ""

    # Frontend
    FRONTEND_URL: str = "http://localhost:3000"

    # ML Models
    ML_MODELS_DIR: str = "./ml_models"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    def model_post_init(self, __context):
        if isinstance(self.CORS_ORIGINS, str):
            try:
                object.__setattr__(self, "CORS_ORIGINS", json.loads(self.CORS_ORIGINS))
            except Exception:
                object.__setattr__(self, "CORS_ORIGINS", [self.CORS_ORIGINS])


settings = Settings()
