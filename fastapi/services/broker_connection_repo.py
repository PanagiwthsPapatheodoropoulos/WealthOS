"""
Repository for managing user broker API credentials and connection state in Redis and in-memory fallback.
Optionally writes to PostgreSQL if asyncpg and DB are available.
"""

import os
import json
import logging
from typing import Optional, Dict, Any
from datetime import datetime, timezone
from services.redis_cache import cache_get, cache_set

logger = logging.getLogger(__name__)

# In-memory fallback dictionary: (user_id, broker) -> data dict
_local_connections: Dict[str, Dict[str, Any]] = {}

# Try optional asyncpg
try:
    import asyncpg
except ImportError:
    asyncpg = None

_pg_pool: Optional[Any] = None

async def _get_optional_db_pool():
    global _pg_pool
    if asyncpg is None:
        return None
    if _pg_pool is None or getattr(_pg_pool, '_closed', True):
        user = os.getenv("POSTGRES_USER", "postgres")
        password = os.getenv("POSTGRES_PASSWORD", "")
        database = os.getenv("POSTGRES_DB", "wealthos")
        host = os.getenv("DB_HOST", "postgres")
        port = int(os.getenv("DB_PORT", 5432))
        try:
            _pg_pool = await asyncpg.create_pool(
                user=user,
                password=password,
                database=database,
                host=host,
                port=port,
                min_size=1,
                max_size=5,
                command_timeout=5.0
            )
        except Exception as e:
            logger.debug(f"Optional PostgreSQL pool unavailable: {e}")
            _pg_pool = None
    return _pg_pool

async def get_user_broker_connection(user_id: str, broker: str = "TRADING212") -> Optional[Dict[str, Any]]:
    """
    Fetches the active broker connection and API key for a user.
    Checks Redis first, then in-memory fallback, then optional PostgreSQL.
    """
    if not user_id:
        return None

    cache_key = f"user_broker:{user_id}:{broker}"

    # 1. Check Redis
    cached = await cache_get(cache_key)
    if cached and isinstance(cached, dict):
        if cached.get("status") == "ACTIVE":
            return cached

    # 2. Check local memory
    local = _local_connections.get(f"{user_id}:{broker}")
    if local and local.get("status") == "ACTIVE":
        return local

    # 3. Check optional DB if pool is available
    try:
        pool = await _get_optional_db_pool()
        if pool:
            async with pool.acquire() as conn:
                row = await conn.fetchrow(
                    """
                    SELECT id, user_id, broker, api_key, is_demo, status, connected_at, last_synced_at
                    FROM user_broker_connections
                    WHERE user_id = $1::uuid AND broker = $2 AND status = 'ACTIVE'
                    """,
                    user_id,
                    broker
                )
                if row:
                    data = {
                        "id": str(row["id"]),
                        "user_id": str(row["user_id"]),
                        "broker": row["broker"],
                        "api_key": row["api_key"],
                        "is_demo": bool(row["is_demo"]),
                        "status": row["status"],
                        "connected_at": row["connected_at"].isoformat() if row["connected_at"] else None,
                        "last_synced_at": row["last_synced_at"].isoformat() if row["last_synced_at"] else None,
                    }
                    await cache_set(cache_key, data, ttl=86400)
                    _local_connections[f"{user_id}:{broker}"] = data
                    return data
    except Exception as e:
        logger.debug(f"DB lookup fallback: {e}")

    return None

async def save_user_broker_connection(
    user_id: str,
    api_key: str,
    is_demo: bool = False,
    broker: str = "TRADING212"
) -> Dict[str, Any]:
    """
    Saves a user broker connection in Redis and memory, and optionally in PostgreSQL.
    """
    cleaned_key = api_key.strip()
    now_iso = datetime.now(timezone.utc).isoformat()
    data = {
        "user_id": user_id,
        "broker": broker,
        "api_key": cleaned_key,
        "is_demo": is_demo,
        "status": "ACTIVE",
        "connected_at": now_iso,
        "last_synced_at": now_iso,
    }

    # Save to Redis (30 days TTL)
    cache_key = f"user_broker:{user_id}:{broker}"
    await cache_set(cache_key, data, ttl=2592000)

    # Save to local in-memory
    _local_connections[f"{user_id}:{broker}"] = data

    # Optionally persist in PostgreSQL
    try:
        pool = await _get_optional_db_pool()
        if pool:
            async with pool.acquire() as conn:
                await conn.execute(
                    """
                    INSERT INTO user_broker_connections (user_id, broker, api_key, is_demo, status, connected_at, last_synced_at)
                    VALUES ($1::uuid, $2, $3, $4, 'ACTIVE', now(), now())
                    ON CONFLICT (user_id, broker) DO UPDATE
                    SET api_key = EXCLUDED.api_key,
                        is_demo = EXCLUDED.is_demo,
                        status = 'ACTIVE',
                        last_synced_at = now()
                    """,
                    user_id,
                    broker,
                    cleaned_key,
                    is_demo
                )
    except Exception as e:
        logger.debug(f"Optional DB persist skipped: {e}")

    return data

async def disconnect_user_broker_connection(user_id: str, broker: str = "TRADING212") -> bool:
    """
    Disconnects a broker connection by marking it DISCONNECTED.
    """
    cache_key = f"user_broker:{user_id}:{broker}"
    disconnected_data = {
        "user_id": user_id,
        "broker": broker,
        "status": "DISCONNECTED"
    }
    await cache_set(cache_key, disconnected_data, ttl=86400)
    _local_connections[f"{user_id}:{broker}"] = disconnected_data

    # Optionally mark in DB
    try:
        pool = await _get_optional_db_pool()
        if pool:
            async with pool.acquire() as conn:
                await conn.execute(
                    """
                    UPDATE user_broker_connections
                    SET status = 'DISCONNECTED'
                    WHERE user_id = $1::uuid AND broker = $2
                    """,
                    user_id,
                    broker
                )
    except Exception as e:
        logger.debug(f"Optional DB disconnect skipped: {e}")

    return True
