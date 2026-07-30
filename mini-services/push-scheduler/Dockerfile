# =============================================================================
# অভ্যাস (Abhyas) — Push Notification Scheduler Dockerfile
# Cron worker that sends Web Push notifications for habit reminders.
# Deployed as a separate Coolify service (no exposed port needed).
# =============================================================================

FROM oven/bun:1-alpine AS base

# Install OpenSSL for Prisma (Alpine doesn't ship it by default)
RUN apk add --no-cache openssl

WORKDIR /app

# Copy package manifests
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install --frozen-lockfile 2>/dev/null || bun install

# Copy the Prisma schema from the root project (needed for client generation)
# The push-scheduler uses the same Prisma schema as the main app.
COPY prisma ./prisma

# Generate Prisma client
RUN bunx prisma generate

# Copy source
COPY index.ts ./

# No port exposed — this is a background worker, not a server
# No healthcheck — the process either runs or exits (Coolify monitors via restart policy)

# Start the push scheduler
CMD ["bun", "index.ts"]
