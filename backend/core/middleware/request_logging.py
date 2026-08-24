"""
PhishLens Agent — Request Logging & Timing Middleware.

Logs execution times and response statuses for observability.
"""

import logging
import time
from typing import Callable

from django.http import HttpRequest, HttpResponse

logger = logging.getLogger("phishlens.api")


class RequestLoggingMiddleware:
    """
    Measures duration and logs endpoint access.
    """

    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]):
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        start_time = time.time()
        response = self.get_response(request)
        duration_ms = round((time.time() - start_time) * 1000, 2)

        # Log API endpoints
        if request.path.startswith("/api/"):
            user_info = getattr(request.user, "username", "anonymous") if hasattr(request, "user") else "anonymous"
            logger.info(
                f"[{request.method}] {request.path} -> {response.status_code} ({duration_ms}ms) [User: {user_info}]"
            )

        # Add response time header
        response["X-Response-Time-Ms"] = str(duration_ms)
        return response
