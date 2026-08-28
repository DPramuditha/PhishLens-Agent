#!/bin/bash
set -e

# Wait for PostgreSQL database if DB_ENGINE is postgresql
if [ "$DB_ENGINE" = "django.db.backends.postgresql" ] || [ -n "$DB_HOST" ]; then
    echo "Waiting for PostgreSQL ($DB_HOST:$DB_PORT) to be ready..."
    python - <<END
import sys
import time
import os
import psycopg2

db_name = os.getenv("DB_NAME", "phishlens_db")
db_user = os.getenv("DB_USER", "postgres")
db_pass = os.getenv("DB_PASSWORD", "")
db_host = os.getenv("DB_HOST", "localhost")
db_port = os.getenv("DB_PORT", "5432")

max_retries = 30
retry_count = 0

while retry_count < max_retries:
    try:
        conn = psycopg2.connect(
            dbname=db_name,
            user=db_user,
            password=db_pass,
            host=db_host,
            port=db_port,
            connect_timeout=2
        )
        conn.close()
        print("PostgreSQL is up and ready!")
        sys.exit(0)
    except Exception as e:
        retry_count += 1
        time.sleep(1)

print(f"Warning: Could not connect to PostgreSQL at {db_host}:{db_port} after {max_retries}s. Proceeding with migrations anyway...")
END
fi

# Ensure media folders exist
mkdir -p media/screenshots media/reports media/avatars

# Run Django migrations
echo "Applying database migrations..."
python manage.py migrate --noinput

# Run static files collection if needed (optional)
# python manage.py collectstatic --noinput

echo "Starting application server..."
exec "$@"
