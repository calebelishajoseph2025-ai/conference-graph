import time
from collections import defaultdict
from typing import Dict, List
from fastapi import Request, HTTPException, status


_all_limiters: List["InMemoryRateLimiter"] = []


class InMemoryRateLimiter:
    """
    In-memory client rate limiter per client IP and category.
    Enforces Section 11.1 rule 18 while avoiding cross-endpoint lockouts (B20).
    """

    def __init__(self, requests_per_minute: int = 60, category: str = "default", enabled: bool = True):
        self.rpm = requests_per_minute
        self.category = category
        self.enabled = enabled
        self.client_requests: Dict[str, List[float]] = defaultdict(list)
        _all_limiters.append(self)

    def __call__(self, request: Request) -> None:
        if not self.enabled:
            return

        client_host = request.client.host if request.client else "127.0.0.1"
        key = f"{client_host}:{self.category}"
        now = time.time()
        window_start = now - 60.0

        # Prune old timestamps older than 60 seconds
        recent = [t for t in self.client_requests[key] if t > window_start]
        if len(recent) >= self.rpm:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded for {self.category}: maximum {self.rpm} requests per minute.",
            )

        recent.append(now)
        self.client_requests[key] = recent

    def reset(self) -> None:
        """Clear recorded requests for test isolation across all limiters."""
        for lim in _all_limiters:
            lim.client_requests.clear()


# Separate limiter instances per category so a single page doesn't lock itself out (B20)
analytics_rate_limiter = InMemoryRateLimiter(requests_per_minute=60, category="analytics")
compare_rate_limiter = InMemoryRateLimiter(requests_per_minute=60, category="compare")
graph_rate_limiter = InMemoryRateLimiter(requests_per_minute=60, category="graph")
recommend_rate_limiter = InMemoryRateLimiter(requests_per_minute=60, category="recommend")
