"""
PhishLens Agent — Rate Limiting Middleware.

Protects sensitive endpoints (e.g. /api/scan/, /api/auth/) from brute force
attacks and scanning abuse with an in-memory sliding window algorithm.
"""

import time
from collections import defaultdict
from typing import Callable, Dict, List

from django.conf import settings
from django.http import HttpRequest, HttpResponse

from backend.core.utils.responses import api_error


class RateLimitMiddleware:
    """
    In-memory sliding window rate limiter.
    Configurable via settings.RATE_LIMIT_PER_MINUTE (default 120 req/min).
    """

    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]):
        self.get_response = get_response
        self.request_records: Dict[str, List[float]] = defaultdict(list)
        self.window_seconds = 60
        self.max_requests_per_window = getattr(settings, "RATE_LIMIT_PER_MINUTE", 120)

    def __call__(self, request: HttpRequest) -> HttpResponse:
        # Exempt health checks and OPTIONS preflight
        if request.method == "OPTIONS" or request.path in ["/api/health/", "/admin/"]:
            return self.get_response(request)

        client_key = self._get_client_key(request)
        now = time.time()

        # Clean old timestamps
        timestamps = [t for t in self.request_records[client_key] if now - t < self.window_seconds]
        self.request_records[client_key] = timestamps

        if len(timestamps) >= self.max_requests_per_window:
            return api_error(
                error="Rate limit exceeded. Please wait a moment before retrying.",
                status=429,
                code="RATE_LIMIT_EXCEEDED",
            )

        self.request_records[client_key].append(now)
        return self.get_response(request)

    @staticmethod
    def _get_client_key(request: HttpRequest) -> str:
        """Determines unique identifier for the client (User ID or IP address)."""
        user = getattr(request, "user", None)
        if user and user.is_authenticated:
            return f"user_{user.id}"

        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            ip = x_forwarded_for.split(",")[0].strip()
        else:
            ip = request.META.get("REMOTE_ADDR", "unknown")

        return f"ip_{ip}"
