"""Pydantic request models for VAD endpoints."""

from enum import Enum

from pydantic import BaseModel, Field


class OutputFormat(str, Enum):
    """Output format for VAD detection results."""

    JSON = "json"
    AUDIO = "audio"


class VADParams(BaseModel):
    """Query parameters for VAD detection endpoints."""

    threshold: float = Field(
        default=0.5,
        ge=0.0,
        le=1.0,
        description="Speech detection threshold (0-1). Higher values are more strict.",
    )
    min_speech_duration_ms: int = Field(
        default=250,
        ge=0,
        description="Minimum speech segment duration in milliseconds.",
    )
    min_silence_duration_ms: int = Field(
        default=100,
        ge=0,
        description="Minimum silence duration to split speech segments.",
    )
    output_sample_rate: int = Field(
        default=16000,
        ge=8000,
        le=48000,
        description="Sample rate for output audio (only applies to audio output).",
    )
    return_seconds: bool = Field(
        default=True,
        description="Return timestamps in seconds (True) or samples (False).",
    )
