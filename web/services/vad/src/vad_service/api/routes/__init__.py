"""API route modules."""

from vad_service.api.routes.health import router as health_router
from vad_service.api.routes.vad import router as vad_router

__all__ = ["health_router", "vad_router"]
