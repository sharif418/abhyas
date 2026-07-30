# =============================================================================
# অভ্যাস (Abhyas) — Social WebSocket Service Dockerfile
# Standalone Socket.io server for leaderboard + activity feed.
# Deployed as a separate Coolify service on its own subdomain.
# =============================================================================

FROM oven/bun:1-alpine AS base

# Install wget for healthcheck
RUN apk add --no-cache wget

WORKDIR /app

# Copy package manifests
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install --frozen-lockfile 2>/dev/null || bun install

# Copy source
COPY index.ts ./

# Healthcheck — hits the /healthz endpoint which returns 200 OK.
# This is separate from Socket.io's root path which returns 400.
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=5 \
  CMD wget -q -O /dev/null --tries=1 --timeout=5 http://localhost:3003/healthz || exit 1

EXPOSE 3003

# Start the social WebSocket service
CMD ["bun", "index.ts"]
