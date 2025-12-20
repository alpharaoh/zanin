"""Health check endpoints."""

import os

from fastapi import APIRouter, Depends

from sid_service import __version__
from sid_service.api.dependencies import get_profile_store, get_speaker_encoder
from sid_service.core.config import settings
from sid_service.models.responses import HealthResponse
from sid_service.services.profile_store import ProfileStore
from sid_service.services.speaker_encoder import SpeakerEncoder

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
async def health_check(
    encoder: SpeakerEncoder = Depends(get_speaker_encoder),
    store: ProfileStore = Depends(get_profile_store),
) -> HealthResponse:
    """
    Check the health of the service.

    Returns the service status, model loading state, and storage accessibility.
    """
    # Check if profiles directory is writable
    profiles_dir_writable = os.access(settings.profiles_dir, os.W_OK)

    # Determine overall health
    is_healthy = encoder.is_initialized and profiles_dir_writable

    return HealthResponse(
        status="healthy" if is_healthy else "unhealthy",
        model_loaded=encoder.is_initialized,
        profiles_dir_writable=profiles_dir_writable,
        version=__version__,
    )


@router.get("/health/ready")
async def readiness_check(
    encoder: SpeakerEncoder = Depends(get_speaker_encoder),
) -> dict:
    """
    Kubernetes readiness probe.

    Returns 200 if the service is ready to accept requests.
    """
    if not encoder.is_initialized:
        return {"status": "not_ready", "reason": "Model not loaded"}

    return {"status": "ready"}


@router.get("/health/live")
async def liveness_check() -> dict:
    """
    Kubernetes liveness probe.

    Returns 200 if the service is alive.
    """
    return {"status": "alive"}
