# Agents Service Dockerfile
# Multi-stage build for smaller production image

# Stage 1: Build stage
FROM oven/bun:1 AS builder

WORKDIR /app

# Copy workspace config and lockfile
COPY package.json bun.lock ./
COPY services/agents/package.json ./services/agents/

# Install dependencies
RUN bun install --frozen-lockfile

# Copy agents source
COPY services/agents/ ./services/agents/


# Stage 2: Production stage
FROM oven/bun:1-slim

WORKDIR /app

# Copy built artifacts and node_modules
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/services/agents ./services/agents

WORKDIR /app/services/agents

# Expose port (non-standard)
EXPOSE 3101

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD bun -e "fetch('http://localhost:' + (process.env.PORT || 3101) + '/health').then(r => process.exit(r.ok ? 0 : 1))" || exit 1

# Run the service
CMD ["bun", "run", "src/server.ts"]
