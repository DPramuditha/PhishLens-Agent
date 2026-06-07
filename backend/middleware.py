"""
PhishLens Agent — Custom CORS Middleware.

Adds CORS headers to allow the React frontend to communicate
with the Django backend during development.
"""


class CORSMiddleware:
    """
    Simple CORS middleware that allows all origins during development.
    For production, restrict to specific origins.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Handle preflight OPTIONS request
        if request.method == "OPTIONS":
            from django.http import HttpResponse
            response = HttpResponse()
            response["Access-Control-Allow-Origin"] = "*"
            response["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
            response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With"
            response["Access-Control-Max-Age"] = "86400"
            return response

        response = self.get_response(request)

        response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With"

        return response
