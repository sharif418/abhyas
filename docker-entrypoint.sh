#!/bin/sh
# Temporary debug entrypoint — starts server with error logging
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [entrypoint] $*"; }

log "Starting অভ্যাস (Abhyas) production server..."

# Run migrations in background
(
  log "Background: running database migrations..."
  npx prisma migrate deploy 2>&1 | while read line; do log "migration: $line"; done
  log "Background: migrations finished (exit: $?)."
) &

# Start server with full error output
log "Starting Next.js server on port ${PORT:-3000}..."
log "Working directory: $(pwd)"
log "Files in /app:" && ls -la /app/ 2>&1 | head -20
log "server.js exists:" && ls -la /app/server.js 2>&1

# Use node directly with error tracing
exec node --trace-warnings server.js 2>&1
