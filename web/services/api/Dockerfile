# API Service Dockerfile
# Multi-stage build for smaller production image

# Stage 1: Build stage
FROM oven/bun:1 AS builder

WORKDIR /app

# Copy workspace package files first for better caching
COPY package.json bun.lock ./

# Copy workspace packages that API depends on
COPY packages/auth/package.json ./packages/auth/
COPY packages/db/package.json ./packages/db/
COPY packages/env/package.json ./packages/env/

# Copy API package.json
COPY services/api/package.json ./services/api/

# Create minimal workspace structure (empty dirs for other workspaces)
RUN mkdir -p client services/agents services/vad services/sid

# Create dummy package.json files for workspaces we don't need
RUN echo '{"name":"client","private":true}' > client/package.json && \
    echo '{"name":"agents","private":true}' > services/agents/package.json && \
    echo '{"name":"vad","private":true}' > services/vad/package.json && \
    echo '{"name":"sid","private":true}' > services/sid/package.json

# Install dependencies (can't use --frozen-lockfile due to dummy workspaces)
RUN bun install

# Copy actual source code
COPY packages/ ./packages/
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
