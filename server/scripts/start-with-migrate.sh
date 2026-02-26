#!/bin/sh
# Retry migrate deploy (Neon/serverless DB may need time to wake up).
MAX_ATTEMPTS=3
ATTEMPT=1

while [ "$ATTEMPT" -le "$MAX_ATTEMPTS" ]; do
  echo "Running prisma migrate deploy (attempt $ATTEMPT/$MAX_ATTEMPTS)..."
  if npx prisma migrate deploy; then
    echo "Migrations applied successfully."
    break
  fi
  if [ "$ATTEMPT" -eq "$MAX_ATTEMPTS" ]; then
    echo "All migrate attempts failed. Exiting."
    exit 1
  fi
  echo "Migrate failed. Retrying in 5s..."
  sleep 5
  ATTEMPT=$((ATTEMPT + 1))
done

exec node dist/src/main
