"""Health check endpoints."""

from fastapi import APIRouter, Depends

from vad_service import __version__
from vad_service.api.dependencies import get_vad_processor
from vad_service.models.responses import HealthResponse, ReadinessResponse
from vad_service.services.vad_processor import VADProcessor

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
async def health(
    processor: VADProcessor = Depends(get_vad_processor),
) -> HealthResponse:
    """
    Basic health check endpoint.

    Returns service status and version information.
    """
    return HealthResponse(
        status="healthy",
        version=__version__,
        model_loaded=processor.is_initialized,
    )


@router.get("/health/ready", response_model=ReadinessResponse)
async def readiness(
    processor: VADProcessor = Depends(get_vad_processor),
) -> ReadinessResponse:
    """
    Readiness check endpoint.

    Returns whether the service is ready to accept requests.
    Used by container orchestrators like Kubernetes.
    """
    model_ready = processor.is_initialized

    return ReadinessResponse(
        ready=model_ready,
        checks={
            "vad_model": "ok" if model_ready else "not_loaded",
        },
    )


@router.get("/health/live")
async def liveness() -> dict:
    """
    Liveness check endpoint.

    Returns whether the process is alive.
    Used by container orchestrators like Kubernetes.
    """
    return {"alive": True}
