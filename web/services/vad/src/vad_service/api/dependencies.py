"""FastAPI dependencies for dependency injection."""

from vad_service.services.vad_processor import VADProcessor

# Global singleton instance
_vad_processor: VADProcessor | None = None


def get_vad_processor() -> VADProcessor:
    """
    Dependency to get the VAD processor instance.

    This returns the global singleton instance that is initialized
    at application startup.
    """
    if _vad_processor is None:
        raise RuntimeError(
            "VAD processor not initialized. Application startup may have failed."
        )
    return _vad_processor


def set_vad_processor(processor: VADProcessor) -> None:
    """
    Set the global VAD processor instance.

    Called during application startup.
    """
    global _vad_processor
    _vad_processor = processor
