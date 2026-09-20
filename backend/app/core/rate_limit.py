import time
import threading
from collections import defaultdict
from typing import Callable, Dict, List, Optional
from fastapi import HTTPException, Request, status
from app.core.config import settings


class InMemoryRateLimiter:
    """
    High-performance sliding-window in-memory rate limiter with thread-safe locks
    and automatic expired timestamp eviction.
    """

    def __init__(self, key_prefix: str, limit_provider: Callable[[], int], window_seconds: int = 60):
        self.key_prefix = key_prefix
        self.limit_provider = limit_provider
        self.window_seconds = window_seconds
        self._requests: Dict[str, List[float]] = defaultdict(list)
        self._lock = threading.Lock()

    def _get_client_identifier(self, request: Request) -> str:
        # Prefer X-Forwarded-For if behind proxy, fallback to client host
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            client_ip = forwarded.split(",")[0].strip()
        else:
            client_ip = request.client.host if request.client else "unknown_client"
        return f"{self.key_prefix}:{client_ip}"

    def check_rate_limit(self, request: Request) -> None:
        if not settings.RATE_LIMIT_ENABLED:
            return

        limit = self.limit_provider()
        if limit <= 0:
            return

        key = self._get_client_identifier(request)
        now = time.time()
        window_start = now - self.window_seconds

        with self._lock:
            # Evict timestamps outside sliding window
            self._requests[key] = [t for t in self._requests[key] if t > window_start]

            if len(self._requests[key]) >= limit:
                retry_after = int(self.window_seconds - (now - self._requests[key][0])) + 1
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Rate limit exceeded. Please try again later.",
                    headers={"Retry-After": str(max(1, retry_after))},
                )

            self._requests[key].append(now)

    def reset(self) -> None:
        """Clear recorded requests (useful for tests)."""
        with self._lock:
            self._requests.clear()

    async def __call__(self, request: Request) -> None:
        self.check_rate_limit(request)


# Pre-configured route rate limiters
rate_limit_auth = InMemoryRateLimiter("auth", lambda: settings.RATE_LIMIT_AUTH_PER_MINUTE)
rate_limit_ai = InMemoryRateLimiter("ai", lambda: settings.RATE_LIMIT_AI_PER_MINUTE)
rate_limit_import = InMemoryRateLimiter("import", lambda: settings.RATE_LIMIT_IMPORT_PER_MINUTE)
rate_limit_general = InMemoryRateLimiter("general", lambda: settings.RATE_LIMIT_DEFAULT_PER_MINUTE)
