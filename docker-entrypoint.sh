#!/bin/sh
# =============================================================================
# অভ্যাস — Docker Entrypoint
# 1. Runs Prisma database migrations with a retry loop (handles DB startup race)
# 2. Starts the Next.js standalone server
#
# Fail-fast philosophy: if migrations cannot be applied after retries, the
# container exits non-zero so the orchestrator (Coolify/Docker/k8s) restarts it.
# =============================================================================

set -e

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [entrypoint] $*"; }

log "Starting অভ্যাস (Abhyas) production server..."

# ---------------------------------------------------------------------------
# 1. Run Prisma migrations with retry.
#    `migrate deploy` is production-safe: it applies pending migrations and
#    NEVER resets data. The retry loop handles the race where the Postgres
#    container isn't ready yet when this container starts.
#    We do NOT fall back to `db push --accept-data-loss` in production —
#    a failed migration should fail the container, not silently mutate schema.
# ---------------------------------------------------------------------------
MIGRATE_OK=0
for i in $(seq 1 30); do
  log "Running database migrations (attempt ${i}/30)..."
  if npx prisma migrate deploy; then
    MIGRATE_OK=1
    log "Database migrations complete."
    break
  fi
  log "Migration attempt ${i} failed, retrying in 2s..."
  sleep 2
done

if [ "$MIGRATE_OK" -ne 1 ]; then
  log "ERROR: Database migrations failed after 30 attempts. Aborting."
  exit 1
fi

# ---------------------------------------------------------------------------
# 2. Start the Next.js standalone server.
#    `exec` replaces the shell so signals (SIGTERM) reach Node directly,
#    enabling graceful shutdown.
# ---------------------------------------------------------------------------
log "Starting Next.js server on port ${PORT:-3000}..."
exec node server.js
