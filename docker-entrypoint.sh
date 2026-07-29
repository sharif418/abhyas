#!/bin/sh
# =============================================================================
# অভ্যাস — Docker Entrypoint
# 1. Runs Prisma database migrations (non-blocking, in background)
# 2. Starts the Next.js standalone server immediately
#
# Migrations run via the Prisma CLI JS entry point (node_modules/prisma/build)
# which is always available in the Docker image. We avoid `npx` which tries
# to download packages at runtime.
# =============================================================================

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [entrypoint] $*"; }

log "Starting অভ্যাস (Abhyas) production server..."

# Locate the Prisma CLI binary (different paths across versions)
PRISMA_CLI=""
for p in \
  "./node_modules/prisma/build/index.js" \
  "./node_modules/.bin/prisma" \
  "./node_modules/@prisma/cli/build/index.js"; do
  if [ -f "$p" ] || [ -x "$p" ]; then PRISMA_CLI="$p"; break; fi
done

# ---------------------------------------------------------------------------
# Run Prisma migrations in the background (non-blocking).
# The /api/health endpoint reports DB status once the server is up.
# ---------------------------------------------------------------------------
(
  log "Background: running database migrations..."
  if [ -n "$PRISMA_CLI" ]; then
    log "Background: using prisma at $PRISMA_CLI"
    node "$PRISMA_CLI" migrate deploy 2>&1 | while read line; do log "migration: $line"; done
    log "Background: migrations finished."
  else
    log "Background: prisma CLI not found, trying npx fallback..."
    npx --yes prisma migrate deploy 2>&1 | while read line; do log "migration: $line"; done
    log "Background: migrations finished (npx)."
  fi
) &

# ---------------------------------------------------------------------------
# Start the Next.js standalone server immediately.
# `exec` replaces the shell so signals (SIGTERM) reach Node directly.
# ---------------------------------------------------------------------------
log "Starting Next.js server on port ${PORT:-3000}..."
exec node server.js
