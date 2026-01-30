#!/bin/sh
set -e

echo "Waiting for database to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0
until npx prisma migrate deploy 2>/dev/null; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ "$RETRY_COUNT" -ge "$MAX_RETRIES" ]; then
    echo "ERROR: Database not available after $MAX_RETRIES attempts"
    exit 1
  fi
  echo "Database not ready yet (attempt $RETRY_COUNT/$MAX_RETRIES). Retrying in 3s..."
  sleep 3
done

echo "Migrations applied successfully!"
echo "Starting application..."
exec node server.js
