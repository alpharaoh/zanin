# Agents Service Dockerfile
# Multi-stage build for smaller production image

# Stage 1: Build stage
FROM oven/bun:1 AS builder

WORKDIR /app

# Copy only the agents package.json (not root workspace)
COPY services/agents/package.json ./

# Install dependencies (standalone, not as workspace)
RUN bun install

# Copy agents source
COPY services/agents/ ./


# Stage 2: Production stage
FROM oven/bun:1-slim

WORKDIR /app

# Copy built artifacts and node_modules
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/package.json ./

# Create non-root user
RUN useradd --create-home --shell /bin/bash appuser && \
    chown -R appuser:appuser /app
USER appuser

# Set production environment
ENV NODE_ENV=production

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD bun -e "fetch('http://localhost:' + (process.env.PORT || 3001) + '/health').then(r => process.exit(r.ok ? 0 : 1))" || exit 1

# Run the service
CMD ["bun", "run", "src/server.ts"]
