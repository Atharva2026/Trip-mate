"""
TripMate AI v2 — Resilient Tool Call Infrastructure

Universal wrapper for every external API call (Tavily, Unsplash, AviationStack,
weather, geocoding). Enforces: timeout → retry → fallback → NEVER raise.

Usage:
    result = await safe_tool_call(
        fetch_unsplash_images, destination,
        timeout_s=3.0, retries=1,
        fallback=lambda dest: generate_placeholder(dest),
        source_name="unsplash",
    )
    # result.success tells whether live data was retrieved
    # result.data is always usable (live or fallback)
    # result.fallback_used tells the frontend what to display
"""

import asyncio
import time
import logging
from dataclasses import dataclass, field
from typing import Any, Callable, Optional

logger = logging.getLogger("tripmate.resilient")


@dataclass
class ToolCallResult:
    """
    Wraps every external call result with provenance metadata.

    The frontend uses these fields to decide what badges / indicators to show:
    - success=True, fallback_used=False → "🟢 Live"
    - success=False, fallback_used=True → "📋 Estimated" (fallback data shown)
    - success=False, fallback_used=False → "❌ Unavailable" (no data at all)
    """

    data: Any = None
    source: str = "unknown"
    success: bool = False
    fallback_used: bool = False
    latency_ms: float = 0.0
    fetched_at: float = field(default_factory=time.time)
    error: str | None = None

    def to_freshness_dict(self) -> dict:
        """Convert to the data_freshness format consumed by the API response."""
        if self.success:
            source_label = "live"
        elif self.fallback_used:
            source_label = "estimated"
        else:
            source_label = "unavailable"

        return {
            "source": source_label,
            "fetched_at": self.fetched_at,
            "latency_ms": round(self.latency_ms, 1),
        }

    def to_log_dict(self) -> dict:
        """Convert to the tool_call_log format for observability."""
        return {
            "tool": self.source,
            "latency_ms": round(self.latency_ms, 1),
            "success": self.success,
            "fallback_used": self.fallback_used,
            "error": self.error,
        }


async def _run_with_timeout(fn: Callable, args: tuple, kwargs: dict, timeout_s: float) -> Any:
    """
    Run a function with a timeout. Handles both sync and async callables.
    """
    if asyncio.iscoroutinefunction(fn):
        return await asyncio.wait_for(fn(*args, **kwargs), timeout=timeout_s)
    else:
        # Run sync function in a thread pool to avoid blocking the event loop
        loop = asyncio.get_event_loop()
        return await asyncio.wait_for(
            loop.run_in_executor(None, lambda: fn(*args, **kwargs)),
            timeout=timeout_s,
        )


async def safe_tool_call(
    fn: Callable,
    *args,
    timeout_s: float = 4.0,
    retries: int = 1,
    fallback: Optional[Callable] = None,
    source_name: str = "unknown",
    **kwargs,
) -> ToolCallResult:
    """
    Universal wrapper for every external API call.

    Guarantees:
    - Will NEVER raise an exception to the caller
    - Will ALWAYS return a ToolCallResult (possibly with data=None)
    - Enforces timeout → retry → fallback chain

    Args:
        fn: The function to call (sync or async)
        timeout_s: Max seconds per attempt (default 4.0)
        retries: Number of retries after first failure (default 1, so 2 total attempts)
        fallback: Optional function to call if all attempts fail (sync or async)
        source_name: Human-readable name for logging and provenance tracking
    """
    start = time.monotonic()
    last_error = None
    total_attempts = retries + 1

    for attempt in range(total_attempts):
        try:
            result = await _run_with_timeout(fn, args, kwargs, timeout_s)
            latency = (time.monotonic() - start) * 1000

            logger.info(
                f"tool_call OK source={source_name} attempt={attempt + 1}/{total_attempts} "
                f"latency_ms={latency:.0f}"
            )

            return ToolCallResult(
                data=result,
                source=source_name,
                success=True,
                fallback_used=False,
                latency_ms=latency,
            )

        except asyncio.TimeoutError:
            last_error = f"timeout after {timeout_s}s"
            logger.warning(
                f"tool_call TIMEOUT source={source_name} attempt={attempt + 1}/{total_attempts} "
                f"timeout_s={timeout_s}"
            )

        except Exception as e:
            last_error = str(e)
            logger.warning(
                f"tool_call ERROR source={source_name} attempt={attempt + 1}/{total_attempts} "
                f"err={e}"
            )

    # All attempts exhausted — try fallback
    latency = (time.monotonic() - start) * 1000

    if fallback is not None:
        try:
            logger.info(f"tool_call FALLBACK source={source_name}")

            if asyncio.iscoroutinefunction(fallback):
                fallback_result = await fallback(*args, **kwargs)
            else:
                fallback_result = fallback(*args, **kwargs)

            return ToolCallResult(
                data=fallback_result,
                source=source_name,
                success=False,
                fallback_used=True,
                latency_ms=latency,
                error=last_error,
            )

        except Exception as e:
            logger.error(
                f"tool_call FALLBACK FAILED source={source_name} err={e}"
            )
            last_error = f"fallback also failed: {e}"

    # Complete failure — return empty result, NEVER raise
    logger.error(
        f"tool_call TOTAL FAILURE source={source_name} "
        f"latency_ms={latency:.0f} last_error={last_error}"
    )

    return ToolCallResult(
        data=None,
        source=source_name,
        success=False,
        fallback_used=False,
        latency_ms=latency,
        error=last_error,
    )


@dataclass
class AgentMetric:
    agent: str
    latency_ms: float
    cache_hit: bool = False
    llm_tokens: int = 0
    api_calls: int = 0
    success: bool = True

    def to_dict(self) -> dict:
        return {
            "agent": self.agent,
            "latency_ms": round(self.latency_ms, 1),
            "cache_hit": self.cache_hit,
            "llm_tokens": self.llm_tokens,
            "api_calls": self.api_calls,
            "success": self.success
        }

