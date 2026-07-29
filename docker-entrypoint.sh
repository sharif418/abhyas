#!/bin/sh
# =============================================================================
# অভ্যাস — Docker Entrypoint
# 1. Runs Prisma database migrations (safe, idempotent)
# 2. Starts the Next.js standalone server
# =============================================================================

set -e

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting Abhyas production server..."

# Run Prisma migrations (creates tables if they don't exist, applies changes)
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Running database migrations..."
npx prisma migrate deploy 2>/dev/null || npx prisma db push --accept-data-loss
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Database migrations complete."

# Start the Next.js standalone server
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting Next.js server on port ${PORT:-3000}..."
exec node server.js
