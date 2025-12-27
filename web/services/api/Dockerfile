# API Service Dockerfile
# Multi-stage build for smaller production image

# Stage 1: Build stage
FROM oven/bun:1 AS builder

WORKDIR /app

# Copy workspace config and lockfile
COPY package.json bun.lock ./
COPY packages/ ./packages/
COPY services/api/package.json ./services/api/

# Install dependencies
RUN bun install --frozen-lockfile

# Copy API source
COPY services/api/ ./services/api/

# Build TSOA routes
WORKDIR /app/services/api
RUN bun run build


# Stage 2: Production stage
FROM oven/bun:1-slim

WORKDIR /app

# Copy built artifacts and node_modules
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/services/api ./services/api

WORKDIR /app/services/api

# Expose port (non-standard)
EXPOSE 3100

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD bun -e "fetch('http://localhost:' + (process.env.PORT || 3100) + '/health').then(r => process.exit(r.ok ? 0 : 1))" || exit 1

# Run the service
CMD ["bun", "run", "src/server.ts"]
