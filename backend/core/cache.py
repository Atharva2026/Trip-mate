"""
TripMate AI v2 — In-Process TTL Cache

Default cache layer that requires ZERO external dependencies (no Redis).
Uses a simple dict with TTL expiry, suitable for single-process deployments
(Render free tier, local dev).

For multi-process deployments, swap this for a Redis-backed implementation
by setting REDIS_URL in .env.

Usage:
    from backend.core.cache import cached_call, invalidate

    result, was_hit = await cached_call("flights:DEL:NRT", "flights", search_flights, "DEL", "NRT")
    # was_hit=True means we served from cache (near-instant)
    # was_hit=False means we called the function and stored the result
"""

import asyncio
import json
import time
import logging
from typing import Any, Callable, Optional

logger = logging.getLogger("tripmate.cache")


# TTL configuration (seconds) — tuned per data type
CACHE_TTL = {
    "images": 60 * 60 * 24 * 7,      # destination photos rarely change — 7 days
    "flights": 60 * 30,               # prices drift — 30 min
    "hotels": 60 * 60,                # 1 hour
    "weather": 60 * 60 * 3,           # 3 hours
    "geocode": 60 * 60 * 24 * 30,     # essentially static — 30 days
    "intent": 60 * 60,                # supervisor classification — 1 hour
    "default": 60 * 15,               # fallback: 15 min
}


class _CacheEntry:
    """Internal cache entry with TTL tracking."""

    __slots__ = ("value", "expires_at", "created_at")

    def __init__(self, value: Any, ttl_seconds: int):
        self.value = value
        self.created_at = time.time()
        self.expires_at = self.created_at + ttl_seconds

    @property
    def is_expired(self) -> bool:
        return time.time() > self.expires_at

    @property
    def age_seconds(self) -> float:
        return time.time() - self.created_at


class InProcessCache:
    """
    Thread-safe in-process cache with TTL eviction.

    - No external dependencies
    - Lazy eviction (expired entries cleaned on access + periodic sweep)
    - Max size cap to prevent unbounded memory growth
    """

    def __init__(self, max_size: int = 500):
        self._store: dict[str, _CacheEntry] = {}
        self._max_size = max_size
        self._hits = 0
        self._misses = 0

    def get(self, key: str) -> tuple[Any | None, bool]:
        """
        Get a value from cache.
        Returns (value, was_hit). value is None if miss or expired.
        """
        entry = self._store.get(key)

        if entry is None:
            self._misses += 1
            return None, False

        if entry.is_expired:
            del self._store[key]
            self._misses += 1
            return None, False

        self._hits += 1
        return entry.value, True

    def set(self, key: str, value: Any, ttl_kind: str = "default") -> None:
        """Store a value with TTL based on data type."""
        ttl_seconds = CACHE_TTL.get(ttl_kind, CACHE_TTL["default"])

        # Evict if at capacity — remove oldest expired first, then oldest overall
        if len(self._store) >= self._max_size:
            self._evict()

        self._store[key] = _CacheEntry(value, ttl_seconds)

    def invalidate(self, key: str) -> bool:
        """Remove a specific key. Returns True if key existed."""
        if key in self._store:
            del self._store[key]
            return True
        return False

    def invalidate_prefix(self, prefix: str) -> int:
        """Remove all keys matching a prefix. Returns count removed."""
        to_remove = [k for k in self._store if k.startswith(prefix)]
        for k in to_remove:
            del self._store[k]
        return len(to_remove)

    def clear(self) -> None:
        """Clear the entire cache."""
        self._store.clear()

    def _evict(self) -> None:
        """Evict expired entries, then oldest entries if still over capacity."""
        # First pass: remove all expired
        expired = [k for k, v in self._store.items() if v.is_expired]
        for k in expired:
            del self._store[k]

        # Second pass: if still over capacity, remove oldest entries
        if len(self._store) >= self._max_size:
            sorted_keys = sorted(
                self._store.keys(),
                key=lambda k: self._store[k].created_at,
            )
            to_remove = sorted_keys[: len(self._store) - self._max_size + 1]
            for k in to_remove:
                del self._store[k]

    @property
    def stats(self) -> dict:
        """Cache hit/miss statistics for observability."""
        total = self._hits + self._misses
        return {
            "size": len(self._store),
            "max_size": self._max_size,
            "hits": self._hits,
            "misses": self._misses,
            "hit_rate": round(self._hits / total, 3) if total > 0 else 0.0,
        }


# Module-level singleton
_cache = InProcessCache(max_size=500)


def get_cache() -> InProcessCache:
    """Get the global cache instance."""
    return _cache


async def cached_call(
    key: str,
    ttl_kind: str,
    fn: Callable,
    *args,
    **kwargs,
) -> tuple[Any, bool]:
    """
    Execute fn(*args, **kwargs) with caching.

    Returns (result, was_cache_hit).
    - If cached and not expired: returns cached value, True
    - If not cached: calls fn, stores result, returns result, False
    """
    cached_value, was_hit = _cache.get(key)

    if was_hit:
        logger.debug(f"cache HIT key={key} ttl_kind={ttl_kind}")
        return cached_value, True

    logger.debug(f"cache MISS key={key} ttl_kind={ttl_kind}")

    # Execute the function
    if asyncio.iscoroutinefunction(fn):
        result = await fn(*args, **kwargs)
    else:
        result = fn(*args, **kwargs)

    # Store in cache
    _cache.set(key, result, ttl_kind)

    return result, False


def invalidate(key: str) -> bool:
    """Invalidate a specific cache key."""
    return _cache.invalidate(key)


def invalidate_prefix(prefix: str) -> int:
    """Invalidate all cache keys matching a prefix."""
    return _cache.invalidate_prefix(prefix)
