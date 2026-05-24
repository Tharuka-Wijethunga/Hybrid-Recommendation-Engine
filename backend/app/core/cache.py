import json
import logging
from typing import Any, Optional

import redis.asyncio as aioredis

from app.core.config import settings

logger = logging.getLogger(__name__)

_redis_client: Optional[aioredis.Redis] = None


async def get_redis() -> aioredis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    return _redis_client


async def cache_get(key: str) -> Optional[Any]:
    try:
        client = await get_redis()
        value = await client.get(key)
        return json.loads(value) if value else None
    except Exception as e:
        logger.warning(f"Cache GET failed for {key}: {e}")
        return None


async def cache_set(key: str, value: Any, ttl: int = 3600) -> None:
    try:
        client = await get_redis()
        await client.setex(key, ttl, json.dumps(value))
    except Exception as e:
        logger.warning(f"Cache SET failed for {key}: {e}")


async def cache_delete(key: str) -> None:
    try:
        client = await get_redis()
        await client.delete(key)
    except Exception as e:
        logger.warning(f"Cache DELETE failed for {key}: {e}")


async def cache_invalidate_pattern(pattern: str) -> None:
    try:
        client = await get_redis()
        keys = await client.keys(pattern)
        if keys:
            await client.delete(*keys)
    except Exception as e:
        logger.warning(f"Cache pattern invalidation failed for {pattern}: {e}")
