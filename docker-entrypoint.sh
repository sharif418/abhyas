#!/bin/sh
# =============================================================================
# অভ্যাস — Docker Entrypoint
# 1. Runs Prisma database migrations in the background (non-blocking)
# 2. Starts the Next.js standalone server immediately
# =============================================================================

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [entrypoint] $*"; }

log "Starting অভ্যাস (Abhyas) production server..."

# ---------------------------------------------------------------------------
# Run Prisma migrations in the background (non-blocking).
# Use the local prisma binary directly (not npx, which tries to download).
# The /api/health endpoint will report DB status once the server is up.
# ---------------------------------------------------------------------------
(
  log "Background: running database migrations..."
  if [ -f ./node_modules/.bin/prisma ]; then
    ./node_modules/.bin/prisma migrate deploy 2>&1 | while read line; do log "migration: $line"; done
    log "Background: migrations finished (exit: $?)."
  else
    log "Background: prisma binary not found, trying npx..."
    npx prisma migrate deploy 2>&1 | while read line; do log "migration: $line"; done
    log "Background: migrations finished (exit: $?)."
  fi
) &

# ---------------------------------------------------------------------------
# Start the Next.js standalone server immediately.
# `exec` replaces the shell so signals (SIGTERM) reach Node directly.
# ---------------------------------------------------------------------------
log "Starting Next.js server on port ${PORT:-3000}..."
exec node server.js
