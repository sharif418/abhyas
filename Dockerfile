# =============================================================================
# অভ্যাস (Abhyas) — Production Dockerfile
# Multi-stage build: deps → builder → runtime
# Optimized for minimal image size, non-root execution, and fast cold starts.
# =============================================================================

# ---- Stage 1: Dependencies ----
FROM node:22-alpine AS deps

# Install OpenSSL for Prisma (alpine doesn't ship it by default)
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Copy package manifests only (leverages Docker layer cache)
COPY package.json bun.lock* ./
COPY prisma ./prisma

# Install dependencies with bun for speed
RUN npm install -g bun && \
    bun install --frozen-lockfile

# Generate Prisma client (needs schema only)
RUN bunx prisma generate

# ---- Stage 2: Builder ----
FROM node:22-alpine AS builder

RUN apk add --no-cache openssl libc6-compat
RUN npm install -g bun

WORKDIR /app

# Copy installed deps from stage 1
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma

# Copy source code
COPY . .

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build the Next.js standalone output
# The standalone output bundles only needed node_modules
RUN bun run build

# ---- Stage 3: Runtime (minimal attack surface) ----
FROM node:22-alpine AS runner

RUN apk add --no-cache openssl libc6-compat

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Copy standalone server output (includes minimal node_modules)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy Prisma files for runtime migrations
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma

# Copy the entrypoint script
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Switch to non-root user
USER nextjs

# Expose the app port
EXPOSE 3000

# Health check (hits the Next.js root route)
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Entrypoint: runs Prisma migrations, then starts the server
ENTRYPOINT ["./docker-entrypoint.sh"]
