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

EXPOSE 3003

# Start the social WebSocket service
CMD ["bun", "index.ts"]
