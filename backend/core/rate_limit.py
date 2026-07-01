"""
TripMate AI v2 — Per-IP Rate Limiter

In-process token bucket rate limiter. No Redis dependency.
Applied to /api/travel to prevent abuse.

Limits:
- Anonymous/guest: 2 requests per day per IP
- Authenticated free tier: 30 requests per hour

Usage in FastAPI:
    from backend.core.rate_limit import check_rate_limit, RateLimitExceeded

    @app.post("/api/travel")
    async def travel_planner(request: Request, ...):
        check_rate_limit(request, user_id=None)  # raises RateLimitExceeded
        ...
"""

import time
import logging
from dataclasses import dataclass, field

logger = logging.getLogger("tripmate.rate_limit")


class RateLimitExceeded(Exception):
    """Raised when a client exceeds their rate limit."""

    def __init__(self, retry_after_seconds: int, message: str):
        self.retry_after_seconds = retry_after_seconds
        self.message = message
        super().__init__(message)


@dataclass
class _TokenBucket:
    """Simple token bucket for rate limiting."""

    max_tokens: int
    refill_rate: float  # tokens per second
    tokens: float = 0.0
    last_refill: float = field(default_factory=time.time)

    def __post_init__(self):
        self.tokens = float(self.max_tokens)

    def try_consume(self, count: int = 1) -> tuple[bool, float]:
        """
        Try to consume tokens.
        Returns (allowed, retry_after_seconds).
        """
        now = time.time()
        elapsed = now - self.last_refill
        self.last_refill = now

        # Refill tokens based on elapsed time
        self.tokens = min(self.max_tokens, self.tokens + elapsed * self.refill_rate)

        if self.tokens >= count:
            self.tokens -= count
            return True, 0.0
        else:
            # Calculate how long until enough tokens are available
            deficit = count - self.tokens
            wait_seconds = deficit / self.refill_rate
            return False, wait_seconds


# Rate limit tiers
RATE_LIMITS = {
    "anonymous": {
        "max_tokens": 2,
        "refill_rate": 2 / (24 * 60 * 60),  # 2 per day
        "description": "2 requests per day",
    },
    "authenticated": {
        "max_tokens": 30,
        "refill_rate": 30 / (60 * 60),  # 30 per hour
        "description": "30 requests per hour",
    },
}


class RateLimiter:
    """
    In-process rate limiter with per-key token buckets.

    Keys are typically IP addresses (anonymous) or user IDs (authenticated).
    Buckets are lazily created and periodically cleaned.
    """

    def __init__(self, max_buckets: int = 10000):
        self._buckets: dict[str, _TokenBucket] = {}
        self._max_buckets = max_buckets
        self._last_cleanup = time.time()
        self._cleanup_interval = 60 * 10  # every 10 minutes

    def check(
        self,
        key: str,
        tier: str = "anonymous",
    ) -> None:
        """
        Check if a request is allowed. Raises RateLimitExceeded if not.

        Args:
            key: Identifier (IP address or user ID)
            tier: Rate limit tier ("anonymous" or "authenticated")
        """
        self._maybe_cleanup()

        config = RATE_LIMITS.get(tier, RATE_LIMITS["anonymous"])
        bucket_key = f"{tier}:{key}"

        if bucket_key not in self._buckets:
            self._buckets[bucket_key] = _TokenBucket(
                max_tokens=config["max_tokens"],
                refill_rate=config["refill_rate"],
            )

        bucket = self._buckets[bucket_key]
        allowed, retry_after = bucket.try_consume(1)

        if not allowed:
            retry_seconds = int(retry_after) + 1
            logger.warning(
                f"rate_limit EXCEEDED key={key} tier={tier} "
                f"retry_after={retry_seconds}s"
            )
            raise RateLimitExceeded(
                retry_after_seconds=retry_seconds,
                message=(
                    f"Rate limit exceeded. You are allowed {config['description']} "
                    f"on the {tier} tier. Please try again in {retry_seconds} seconds."
                ),
            )

        logger.debug(
            f"rate_limit OK key={key} tier={tier} "
            f"remaining={bucket.tokens:.1f}/{config['max_tokens']}"
        )

    def _maybe_cleanup(self) -> None:
        """Remove stale buckets to prevent unbounded memory growth."""
        now = time.time()
        if now - self._last_cleanup < self._cleanup_interval:
            return

        self._last_cleanup = now

        # Remove buckets that have been full (inactive) for over an hour
        stale_keys = []
        for key, bucket in self._buckets.items():
            if now - bucket.last_refill > 60 * 60:
                stale_keys.append(key)

        for key in stale_keys:
            del self._buckets[key]

        if stale_keys:
            logger.info(f"rate_limit CLEANUP removed={len(stale_keys)} buckets")


# Module-level singleton
_limiter = RateLimiter()


def get_rate_limiter() -> RateLimiter:
    """Get the global rate limiter instance."""
    return _limiter


def check_rate_limit(client_ip: str, user_id: str | None = None) -> None:
    """
    Convenience function to check rate limit for a request.

    Args:
        client_ip: The client's IP address
        user_id: The authenticated user's ID (None for anonymous)

    Raises:
        RateLimitExceeded: If the rate limit is exceeded
    """
    if user_id:
        _limiter.check(key=user_id, tier="authenticated")
    else:
        _limiter.check(key=client_ip, tier="anonymous")
