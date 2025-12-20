"""Voice profile storage using file-based storage."""

import os
from pathlib import Path

import numpy as np

from ..core.logging import get_logger

logger = get_logger(__name__)


class ProfileStore:
    """
    File-based storage for speaker voice profiles (embeddings).

    Profiles are stored as NumPy arrays in .npy files, organized by user ID.
    """

    def __init__(self, profiles_dir: str) -> None:
        """
        Initialize the profile store.

        Args:
            profiles_dir: Directory to store voice profiles
        """
        self._profiles_dir = Path(profiles_dir)

    def initialize(self) -> None:
        """Create the profiles directory if it doesn't exist."""
        self._profiles_dir.mkdir(parents=True, exist_ok=True)
        logger.info("Profile store initialized", path=str(self._profiles_dir))

    def _get_profile_path(self, user_id: str) -> Path:
        """Get the file path for a user's profile."""
        # Sanitize user_id to prevent path traversal
        safe_user_id = "".join(c for c in user_id if c.isalnum() or c in "-_")
        return self._profiles_dir / f"{safe_user_id}.npy"

    def exists(self, user_id: str) -> bool:
        """Check if a user has an enrolled profile."""
        return self._get_profile_path(user_id).exists()

    def save(self, user_id: str, embedding: np.ndarray) -> None:
        """
        Save a user's voice profile.

        Args:
            user_id: Unique identifier for the user
            embedding: Speaker embedding to save
        """
        profile_path = self._get_profile_path(user_id)
        np.save(profile_path, embedding)
        logger.info(
            "Profile saved",
            user_id=user_id,
            path=str(profile_path),
            embedding_shape=embedding.shape,
        )

    def load(self, user_id: str) -> np.ndarray | None:
        """
        Load a user's voice profile.

        Args:
            user_id: Unique identifier for the user

        Returns:
            Speaker embedding or None if not found
        """
        profile_path = self._get_profile_path(user_id)

        if not profile_path.exists():
            logger.debug("Profile not found", user_id=user_id)
            return None

        embedding = np.load(profile_path)
        logger.debug(
            "Profile loaded",
            user_id=user_id,
            embedding_shape=embedding.shape,
        )
        return embedding

    def delete(self, user_id: str) -> bool:
        """
        Delete a user's voice profile.

        Args:
            user_id: Unique identifier for the user

        Returns:
            True if profile was deleted, False if not found
        """
        profile_path = self._get_profile_path(user_id)

        if not profile_path.exists():
            logger.debug("Profile not found for deletion", user_id=user_id)
            return False

        os.remove(profile_path)
        logger.info("Profile deleted", user_id=user_id)
        return True

    def list_users(self) -> list[str]:
        """List all enrolled user IDs."""
        if not self._profiles_dir.exists():
            return []

        return [p.stem for p in self._profiles_dir.glob("*.npy")]

    def get_profile_info(self, user_id: str) -> dict | None:
        """
        Get information about a user's profile.

        Args:
            user_id: Unique identifier for the user

        Returns:
            Profile info dict or None if not found
        """
        profile_path = self._get_profile_path(user_id)

        if not profile_path.exists():
            return None

        embedding = np.load(profile_path)
        stat = profile_path.stat()

        return {
            "user_id": user_id,
            "embedding_dimension": embedding.shape[0],
            "created_at": stat.st_ctime,
            "modified_at": stat.st_mtime,
            "file_size_bytes": stat.st_size,
        }
