"""API routes for the SID service."""

from .health import router as health_router
from .sid import router as sid_router

__all__ = ["health_router", "sid_router"]
