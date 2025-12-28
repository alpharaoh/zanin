"""Application configuration using Pydantic Settings."""

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        env_prefix="SID_",
    )

    # Server
    host: str = Field(default="0.0.0.0")
    port: int = Field(default=8082)
    workers: int = Field(default=1)
    debug: bool = Field(default=False)

    # Speaker Identification Settings
    similarity_threshold: float = Field(
        default=0.25,
        ge=0.0,
        le=1.0,
        description="Cosine similarity threshold for identifying owner (higher = stricter)",
    )
    min_audio_duration_seconds: float = Field(
        default=1.0,
        ge=0.1,
        description="Minimum audio duration for reliable embedding extraction",
    )
    sample_rate: int = Field(default=16000)

    # Profile Storage
    profiles_dir: str = Field(default="./data/profiles")

    # Processing
    max_file_size_mb: int = Field(default=2048)
    temp_dir: str = Field(default="/tmp/sid-uploads")
    chunk_size: int = Field(default=8192)

    # Observability
    log_level: str = Field(default="INFO")
    log_format: str = Field(default="json")

    @property
    def max_file_size_bytes(self) -> int:
        """Maximum file size in bytes."""
        return self.max_file_size_mb * 1024 * 1024


settings = Settings()
