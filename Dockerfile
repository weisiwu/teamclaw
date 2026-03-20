# ============================================================
# TeamClaw Multi-Stage Dockerfile
# Build: docker build -t teamclaw .
# Run:   docker run -p 3000:3000 -p 9700:9700 teamclaw
# ============================================================

# ── Stage 1: Dependencies ──────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# Install dependencies only when needed
COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps

# ── Stage 2: Builder ────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build Next.js app
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── Stage 3: Server build ───────────────────────────────────
FROM node:20-alpine AS server-builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY server ./server
WORKDIR /app/server
RUN npm ci --legacy-peer-deps && npm run build

# ── Stage 4: Runner ──────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 -G nodejs

# Set production environment defaults
ENV PORT=3000
ENV HOST=0.0.0.0
ENV SERVER_PORT=9700
ENV SERVER_HOST=0.0.0.0

# Install curl for health checks
RUN apk add --no-cache curl

# Prepare directories
RUN mkdir -p /app/public /app/.next/cache /app/server/dist && \
    chown -R nextjs:nodejs /app

# Copy built assets from builder stage
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./

# Copy next binary (devDependency in builder, needed for standalone start)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.bin/next /app/node_modules/.bin/next

# Copy server from server-builder stage
COPY --from=server-builder --chown=nextjs:nodejs /app/server ./server

# Switch to non-root user
USER nextjs

# Expose ports
EXPOSE 3000 9700

# Health check for frontend
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Health check for server
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:9700/api/v1/health || exit 1

# Startup script: validate env then start both services
COPY --chmod=755 <<'EOF' /start.sh
#!/bin/sh
set -e

echo "[startup] Validating environment..."
node /app/server/dist/utils/config-validator.js 2>/dev/null || true

echo "[startup] Starting server on :${SERVER_PORT}..."
node /app/server/dist/index.js &
SERVER_PID=$!

echo "[startup] Starting Next.js on :${PORT}..."
node_modules/.bin/next start -p ${PORT} &
NEXT_PID=$!

echo "[startup] Both services started."
trap "kill $SERVER_PID $NEXT_PID 2>/dev/null" EXIT
wait
EOF

ENTRYPOINT ["sh", "/start.sh"]
