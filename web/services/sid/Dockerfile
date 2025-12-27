# SID Service Dockerfile
# Multi-stage build for smaller production image

# Stage 1: Build stage
FROM python:3.11-slim as builder

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install poetry 2.x (required for PEP 621 [project] format)
RUN pip install --no-cache-dir poetry==2.1.1

WORKDIR /app

# Copy dependency files
COPY pyproject.toml poetry.lock* ./

# Install dependencies to virtual env (--no-root skips installing the project itself)
RUN poetry config virtualenvs.in-project true && \
    poetry install --only main --no-root --no-interaction --no-ansi


# Stage 2: Production stage
FROM python:3.11-slim as production

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy virtual env from builder
COPY --from=builder /app/.venv /app/.venv

# Set up PATH to use virtual env
ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONPATH="/app/src"
ENV PYTHONUNBUFFERED=1
ENV SID_PROFILES_DIR="/data/profiles"

# Copy source code
COPY src/ ./src/

# Create non-root user and directories
RUN useradd --create-home --shell /bin/bash appuser && \
    mkdir -p /data/profiles && \
    chown -R appuser:appuser /app /data
USER appuser

# Expose port (non-standard)
EXPOSE 8101

# Health check (longer start period for model loading)
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
    CMD python -c "import os; import urllib.request; urllib.request.urlopen(f'http://localhost:{os.environ.get(\"SID_PORT\", 8101)}/health/live')" || exit 1

# Run the service
CMD ["python", "-m", "sid_service.main"]
