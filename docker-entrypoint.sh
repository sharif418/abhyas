#!/bin/sh
# =============================================================================
# অভ্যাস — Docker Entrypoint
# Starts the Next.js standalone server. Migrations run in the background.
# =============================================================================

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [entrypoint] $*"; }

log "Starting অভ্যাস (Abhyas) production server..."

# ---------------------------------------------------------------------------
# Run Prisma migrations in the background (non-blocking).
# The /api/health endpoint will report DB status once the server is up.
# This ensures the server starts immediately and the healthcheck can pass.
# ---------------------------------------------------------------------------
(
  log "Background: running database migrations..."
  for i in 1 2 3 4 5; do
    if npx prisma migrate deploy; then
      log "Background: migrations complete."
      break
    fi
    log "Background: migration attempt ${i} failed, retrying in 3s..."
    sleep 3
  done
) &
MIGRATION_PID=$!

# ---------------------------------------------------------------------------
# Start the Next.js standalone server immediately.
# `exec` replaces the shell so signals (SIGTERM) reach Node directly.
# ---------------------------------------------------------------------------
log "Starting Next.js server on port ${PORT:-3000}..."
exec node server.js
