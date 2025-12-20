"""FastAPI application entry point."""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

import structlog
import uvicorn
from fastapi import FastAPI

from sid_service import __version__
from sid_service.api.dependencies import set_profile_store, set_speaker_encoder
from sid_service.api.middleware import add_middleware
from sid_service.api.routes import health_router, sid_router
from sid_service.core.config import settings
from sid_service.core.logging import setup_logging
from sid_service.services.profile_store import ProfileStore
from sid_service.services.speaker_encoder import SpeakerEncoder

logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifecycle management."""
    # Startup
    setup_logging(settings.log_level, settings.log_format)  # type: ignore
    logger.info(
        "Starting SID service",
        version=__version__,
        host=settings.host,
        port=settings.port,
    )

    # Initialize profile store
    store = ProfileStore(settings.profiles_dir)
    store.initialize()
    set_profile_store(store)

    # Initialize speaker encoder (this loads the ECAPA-TDNN model)
    encoder = SpeakerEncoder()
    encoder.initialize()
    set_speaker_encoder(encoder)

    logger.info("SID service ready to accept requests")

    yield

    # Shutdown
    logger.info("Shutting down SID service")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="SID Service",
        description=(
            "Speaker Identification service using SpeechBrain ECAPA-TDNN. "
            "Enroll voice profiles and identify speakers in audio recordings."
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
    app.include_router(sid_router)

    return app


# Create application instance
app = create_app()


def run() -> None:
    """Entry point for running the application."""
    uvicorn.run(
        "sid_service.main:app",
        host=settings.host,
        port=settings.port,
        workers=settings.workers,
        reload=settings.debug,
    )


if __name__ == "__main__":
    run()
