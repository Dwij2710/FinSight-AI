"""
FinSight AI - Centralized Redis & In-Memory Cache Service
Implements a dual-tier caching architecture:
1. Primary: Redis (distributed, high-throughput, async & sync compatible).
2. Secondary Fallback: In-memory TTL cache with automatic expiration.
Ensures zero-downtime: Redis failure or absence automatically degrades to in-memory caching.
"""
import os
import time
import json
import logging
from typing import Any, Optional, Dict, Tuple

logger = logging.getLogger("finsight.cache")

class CacheService:
    _instance: Optional['CacheService'] = None

    def __init__(self):
        self.redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        self._redis_client = None
        self._sync_redis_client = None
        self._memory_cache: Dict[str, Tuple[float, Any]] = {}
        self.is_redis_available = False
        self._init_redis()

    @classmethod
    def get_instance(cls) -> 'CacheService':
        if cls._instance is None:
            cls._instance = CacheService()
        return cls._instance

    def _init_redis(self):
        """Attempts to establish connection to Redis with short timeout."""
        try:
            import redis
            import redis.asyncio as aioredis
            
            # Fast sync probe
            probe_client = redis.Redis.from_url(self.redis_url, socket_connect_timeout=0.5, socket_timeout=0.5)
            probe_client.ping()
            
            self._sync_redis_client = probe_client
            self._redis_client = aioredis.from_url(self.redis_url, socket_connect_timeout=0.5, socket_timeout=0.5)
            self.is_redis_available = True
            logger.info(f"[CacheService] Connected to primary Redis at {self.redis_url.split('@')[-1] if '@' in self.redis_url else self.redis_url}")
        except Exception as e:
            self.is_redis_available = False
            self._sync_redis_client = None
            self._redis_client = None
            logger.info(f"[CacheService] Redis not reachable ({e}). Falling back to in-memory TTL cache.")

    # ==================== SYNCHRONOUS METHODS ====================
    def get_sync(self, key: str) -> Optional[Any]:
        """Synchronously retrieves a cached value by key."""
        if self.is_redis_available and self._sync_redis_client:
            try:
                raw = self._sync_redis_client.get(key)
                if raw:
                    return json.loads(raw)
            except Exception as e:
                logger.warning(f"[CacheService] Sync Redis GET error on key '{key}': {e}. Falling back to memory.")
                self.is_redis_available = False

        # In-memory fallback
        now = time.time()
        if key in self._memory_cache:
            expires_at, val = self._memory_cache[key]
            if now < expires_at:
                return val
            else:
                del self._memory_cache[key]
        return None

    def set_sync(self, key: str, value: Any, ttl_seconds: int = 300) -> bool:
        """Synchronously sets a cached value with TTL."""
        if self.is_redis_available and self._sync_redis_client:
            try:
                serialized = json.dumps(value)
                self._sync_redis_client.setex(key, ttl_seconds, serialized)
                return True
            except Exception as e:
                logger.warning(f"[CacheService] Sync Redis SET error on key '{key}': {e}. Falling back to memory.")
                self.is_redis_available = False

        # In-memory fallback
        expires_at = time.time() + ttl_seconds
        self._memory_cache[key] = (expires_at, value)
        return True

    def delete_sync(self, key: str) -> bool:
        """Synchronously deletes a key."""
        if self.is_redis_available and self._sync_redis_client:
            try:
                self._sync_redis_client.delete(key)
            except Exception:
                pass
        self._memory_cache.pop(key, None)
        return True

    # ==================== ASYNCHRONOUS METHODS ====================
    async def get_async(self, key: str) -> Optional[Any]:
        """Asynchronously retrieves a cached value by key."""
        if self.is_redis_available and self._redis_client:
            try:
                raw = await self._redis_client.get(key)
                if raw:
                    return json.loads(raw)
            except Exception as e:
                logger.warning(f"[CacheService] Async Redis GET error on key '{key}': {e}. Falling back to memory.")
                self.is_redis_available = False

        return self.get_sync(key)

    async def set_async(self, key: str, value: Any, ttl_seconds: int = 300) -> bool:
        """Asynchronously sets a cached value with TTL."""
        if self.is_redis_available and self._redis_client:
            try:
                serialized = json.dumps(value)
                await self._redis_client.setex(key, ttl_seconds, serialized)
                return True
            except Exception as e:
                logger.warning(f"[CacheService] Async Redis SET error on key '{key}': {e}. Falling back to memory.")
                self.is_redis_available = False

        return self.set_sync(key, value, ttl_seconds)

    async def delete_async(self, key: str) -> bool:
        """Asynchronously deletes a key."""
        if self.is_redis_available and self._redis_client:
            try:
                await self._redis_client.delete(key)
            except Exception:
                pass
        return self.delete_sync(key)

    def prune_expired_memory(self):
        """Purge expired in-memory keys to prevent unbounded memory growth."""
        now = time.time()
        expired = [k for k, (exp, _) in self._memory_cache.items() if exp <= now]
        for k in expired:
            self._memory_cache.pop(k, None)

cache_service = CacheService.get_instance()
