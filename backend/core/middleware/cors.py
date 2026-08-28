"""
PhishLens Agent — CORS Middleware.

Provides cross-origin resource sharing headers for the React frontend,
supporting development open-origins and production domain restrictions.
"""

from typing import Callable
from django.http import HttpRequest, HttpResponse


class CORSMiddleware:
    """
    CORS Middleware allowing cross-origin requests from the React frontend.
    """

    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]):
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        # Handle preflight OPTIONS request
        if request.method == "OPTIONS":
            response = HttpResponse()
            self._add_cors_headers(response)
            return response

        response = self.get_response(request)
        self._add_cors_headers(response)
        return response

    @staticmethod
    def _add_cors_headers(response: HttpResponse) -> None:
        """Adds standard CORS headers."""
        response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        response["Access-Control-Allow-Headers"] = (
            "Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control"
        )
        response["Access-Control-Max-Age"] = "86400"
