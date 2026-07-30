# =============================================================================
# অভ্যাস (Abhyas) — Social WebSocket Service Dockerfile
# Standalone Socket.io server for leaderboard + activity feed.
# Deployed as a separate Coolify service on its own subdomain.
# =============================================================================

FROM oven/bun:1-alpine AS base

WORKDIR /app

# Copy package manifests
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install --frozen-lockfile 2>/dev/null || bun install

# Copy source
COPY index.ts ./

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 bun

USER bun

# Healthcheck — Socket.io responds to HTTP GET with "Transport unknown"
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null --tries=1 --timeout=5 http://localhost:3003/ || exit 1

EXPOSE 3003

# Start the social WebSocket service
CMD ["bun", "index.ts"]
