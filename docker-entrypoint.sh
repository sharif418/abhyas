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
# Run the self-healing migration system in the background (non-blocking).
#
#   1. scripts/migrate-selfheal.mjs — converges the actual PostgreSQL schema
#      to prisma/migrations (idempotent, object-existence guarded) AND repairs
#      the _prisma_migrations bookkeeping table. Fixes "drifted" DBs where
#      plain migrate deploy aborts and new migrations never apply.
#   2. prisma migrate deploy — now a green no-op, but kept as a second layer
#      of defense for freshly provisioned databases.
#
# The /api/health endpoint reports DB status once the server is up.
# ---------------------------------------------------------------------------
(
  log "Background: running self-healing migration system..."
  node scripts/migrate-selfheal.mjs 2>&1 | while read line; do log "$line"; done
  log "Background: selfheal finished."

  log "Background: running prisma migrate deploy (verification layer)..."
  if [ -n "$PRISMA_CLI" ]; then
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
