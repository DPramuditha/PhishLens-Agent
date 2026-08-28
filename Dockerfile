# =============================================================================
# PhishLens Agent — Backend Dockerfile
# Multi-agent AI Phishing Analysis Platform
# =============================================================================

FROM python:3.11-slim

# Prevent Python from writing .pyc files and buffer stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PW_TEST_SCREENSHOT_NO_FONTS_READY=1 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

WORKDIR /app

# Install system dependencies & WHOIS utility
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    libpq-dev \
    whois \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install PyTorch CPU wheels first for optimized layer caching and slim image size
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Copy and install Python requirements
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright browser engine (Chromium) and its system runtime libraries
RUN playwright install-deps chromium && \
    playwright install chromium

# Create runtime directories for media, models and cache
RUN mkdir -p /app/media/screenshots /app/media/reports /app/media/avatars /app/models

# Copy application codebase and ML models
COPY backend/ /app/backend/
COPY models/ /app/models/
COPY manage.py pytest.ini /app/
COPY entrypoint.sh /app/entrypoint.sh

# Fix line endings (if built on Windows) and set execution permissions
RUN sed -i 's/\r$//' /app/entrypoint.sh && \
    chmod +x /app/entrypoint.sh

# Expose backend API port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8000/api/health/ || exit 1

# Entrypoint runs DB checks and migrations before starting the WSGI server
ENTRYPOINT ["/app/entrypoint.sh"]

# Default command: Gunicorn WSGI production server with worker threads
CMD ["gunicorn", "backend.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "2", "--threads", "4", "--timeout", "120"]
