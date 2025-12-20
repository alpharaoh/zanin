"""FastAPI dependencies for dependency injection."""

from sid_service.services.profile_store import ProfileStore
from sid_service.services.speaker_encoder import SpeakerEncoder

# Global singleton instances
_speaker_encoder: SpeakerEncoder | None = None
_profile_store: ProfileStore | None = None


def get_speaker_encoder() -> SpeakerEncoder:
    """
    Dependency to get the speaker encoder instance.

    This returns the global singleton instance that is initialized
    at application startup.
    """
    if _speaker_encoder is None:
        raise RuntimeError(
            "Speaker encoder not initialized. Application startup may have failed."
        )
    return _speaker_encoder


def get_profile_store() -> ProfileStore:
    """
    Dependency to get the profile store instance.

    This returns the global singleton instance that is initialized
    at application startup.
    """
    if _profile_store is None:
        raise RuntimeError(
            "Profile store not initialized. Application startup may have failed."
        )
    return _profile_store


def set_speaker_encoder(encoder: SpeakerEncoder) -> None:
    """
    Set the global speaker encoder instance.

    Called during application startup.
    """
    global _speaker_encoder
    _speaker_encoder = encoder


def set_profile_store(store: ProfileStore) -> None:
    """
    Set the global profile store instance.

    Called during application startup.
    """
    global _profile_store
    _profile_store = store
