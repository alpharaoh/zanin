"""FastAPI application entry point."""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

import structlog
import uvicorn
from fastapi import FastAPI

from vad_service import __version__
from vad_service.api.dependencies import set_vad_processor
from vad_service.api.middleware import add_middleware
from vad_service.api.routes import health_router, vad_router
from vad_service.core.config import settings
from vad_service.core.logging import setup_logging
from vad_service.services.vad_processor import VADProcessor

logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifecycle management."""
    # Startup
    setup_logging(settings.log_level, settings.log_format)  # type: ignore
    logger.info(
        "Starting VAD service",
        version=__version__,
        host=settings.host,
        port=settings.port,
    )

    # Initialize VAD processor
    processor = VADProcessor()
    await processor.initialize()
    set_vad_processor(processor)

    logger.info("VAD service ready to accept requests")

    yield

    # Shutdown
    logger.info("Shutting down VAD service")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="VAD Service",
        description=(
            "Voice Activity Detection service using silero-vad. "
            "Detect speech segments in audio files and optionally "
            "extract only the speech portions."
        ),
        version=__version__,
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
    )

    # Add middleware
    add_middleware(app)

    # Include routers
    app.include_router(health_router)
    app.include_router(vad_router)

    return app


# Create application instance
app = create_app()


def run() -> None:
    """Entry point for running the application."""
    uvicorn.run(
        "vad_service.main:app",
        host=settings.host,
        port=settings.port,
        workers=settings.workers,
        reload=settings.debug,
    )


if __name__ == "__main__":
    run()
