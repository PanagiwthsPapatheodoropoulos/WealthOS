"""
FastAPI Redis Cache Manager with Graceful In-Memory Fallback
Provides distributed cache across worker replicas and prevents upstream rate-limit exhaustion.
"""

import os
import json
import time
import logging
from typing import Any, Optional
try:
    import redis.asyncio as redis
except ImportError:
    redis = None

logger = logging.getLogger(__name__)

_redis_client: Optional[Any] = None
_local_memory_cache: dict[str, tuple[float, Any]] = {}
MAX_LOCAL_CACHE = 1000

def get_redis_client() -> Optional[Any]:
    global _redis_client
    if redis is None:
        return None
    if _redis_client is None:
        host = os.getenv("REDIS_HOST", "redis")
        port = int(os.getenv("REDIS_PORT", "6379"))
        try:
            _redis_client = redis.Redis(
                host=host,
                port=port,
                decode_responses=True,
                socket_connect_timeout=2.0,
                socket_timeout=2.0,
            )
        except Exception as e:
            logger.warning(f"Could not connect to Redis at {host}:{port}: {e}. Using in-memory fallback.")
            _redis_client = None
    return _redis_client

async def cache_get(key: str, fallback_ttl: float = 60.0) -> Optional[Any]:
    """Retrieves item from Redis if available, else checks local memory cache."""
    client = get_redis_client()
    if client:
        try:
            val = await client.get(key)
            if val:
                return json.loads(val)
        except Exception:
            pass  # Fall back to local memory

    # In-memory fallback
    if key in _local_memory_cache:
        ts, data = _local_memory_cache[key]
        if time.time() - ts < fallback_ttl:
            return data
        else:
            _local_memory_cache.pop(key, None)
    return None

async def cache_set(key: str, value: Any, ttl: int = 60):
    """Stores item in Redis with TTL; also keeps a local fallback copy."""
    client = get_redis_client()
    try:
        serialized = json.dumps(value)
        if client:
            try:
                await client.set(key, serialized, ex=ttl)
            except Exception:
                pass
    except Exception:
        pass

    # In-memory backup
    now = time.time()
    if len(_local_memory_cache) >= MAX_LOCAL_CACHE:
        expired = [k for k, (ts, _) in _local_memory_cache.items() if now - ts > ttl]
        for k in expired[:200]:
            _local_memory_cache.pop(k, None)
    _local_memory_cache[key] = (now, value)
