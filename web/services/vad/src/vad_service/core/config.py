"""Application configuration using Pydantic Settings."""

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        env_prefix="VAD_",
    )

    # Server
    host: str = Field(default="0.0.0.0")
    port: int = Field(default=8000)
    workers: int = Field(default=4)
    debug: bool = Field(default=False)

    # VAD Settings
    vad_threshold: float = Field(default=0.5, ge=0.0, le=1.0)
    vad_min_speech_ms: int = Field(default=250, ge=0)
    vad_min_silence_ms: int = Field(default=100, ge=0)
    vad_sample_rate: int = Field(default=16000)

    # Processing
    max_file_size_mb: int = Field(default=2048)
    temp_dir: str = Field(default="/tmp/vad-uploads")
    chunk_size: int = Field(default=8192)

    # Observability
    log_level: str = Field(default="INFO")
    log_format: str = Field(default="json")

    @property
    def max_file_size_bytes(self) -> int:
        """Maximum file size in bytes."""
        return self.max_file_size_mb * 1024 * 1024


settings = Settings()
