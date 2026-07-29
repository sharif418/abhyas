#!/bin/sh
# =============================================================================
# অভ্যাস — Docker Entrypoint
# 1. Runs Prisma database migrations (with short retry for DB startup race)
# 2. Starts the Next.js standalone server
#
# The server starts even if migrations fail — the /api/health endpoint will
# report the DB error so it can be diagnosed. This prevents the container
# from being stuck in a migration loop and unreachable.
# =============================================================================

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [entrypoint] $*"; }

log "Starting অভ্যাস (Abhyas) production server..."

# ---------------------------------------------------------------------------
# 1. Run Prisma migrations with a short retry loop.
#    `migrate deploy` is production-safe: applies pending migrations, never
#    resets data. Retry handles the Postgres container startup race.
# ---------------------------------------------------------------------------
MIGRATE_OK=0
for i in 1 2 3 4 5; do
  log "Running database migrations (attempt ${i}/5)..."
  if npx prisma migrate deploy; then
    MIGRATE_OK=1
    log "Database migrations complete."
    break
  fi
  log "Migration attempt ${i} failed, retrying in 3s..."
  sleep 3
done

if [ "$MIGRATE_OK" -ne 1 ]; then
  log "WARNING: Database migrations failed after 5 attempts."
  log "Server will start anyway — /api/health will report the DB error."
fi

# ---------------------------------------------------------------------------
# 2. Start the Next.js standalone server.
#    `exec` replaces the shell so signals (SIGTERM) reach Node directly.
# ---------------------------------------------------------------------------
log "Starting Next.js server on port ${PORT:-3000}..."
exec node server.js
