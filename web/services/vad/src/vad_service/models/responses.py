"""Pydantic response models for VAD endpoints."""

from pydantic import BaseModel, Field


class SpeechSegment(BaseModel):
    """A detected speech segment with start and end timestamps."""

    start: float = Field(description="Start time of speech segment")
    end: float = Field(description="End time of speech segment")


class VADResponse(BaseModel):
    """Response model for VAD detection endpoint."""

    segments: list[SpeechSegment] = Field(
        description="List of detected speech segments"
    )
    total_speech_duration: float = Field(
        description="Total duration of speech in seconds"
    )
    total_duration: float = Field(
        description="Total duration of the audio file in seconds"
    )
    speech_ratio: float = Field(
        ge=0.0,
        le=1.0,
        description="Ratio of speech to total duration (0-1)",
    )
    processing_time_ms: float = Field(
        description="Time taken to process the audio in milliseconds"
    )


class HealthResponse(BaseModel):
    """Response model for basic health check."""

    status: str = Field(description="Service status")
    version: str = Field(description="Service version")
    model_loaded: bool = Field(description="Whether VAD model is loaded")


class ReadinessResponse(BaseModel):
    """Response model for readiness check."""

    ready: bool = Field(description="Whether service is ready to accept requests")
    checks: dict[str, str] = Field(description="Status of individual readiness checks")
