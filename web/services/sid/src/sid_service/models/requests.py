"""Request models for the SID API."""

from pydantic import BaseModel, Field


class EnrollParams(BaseModel):
    """Parameters for speaker enrollment."""

    user_id: str = Field(
        ...,
        min_length=1,
        max_length=128,
        description="Unique identifier for the user",
    )


class IdentifySegment(BaseModel):
    """A segment of audio to identify."""

    speaker: int = Field(
        ...,
        ge=0,
        description="Speaker ID from diarization (0, 1, 2, ...)",
    )
    start: float = Field(
        ...,
        ge=0.0,
        description="Start time in seconds",
    )
    end: float = Field(
        ...,
        gt=0.0,
        description="End time in seconds",
    )


class IdentifyParams(BaseModel):
    """Parameters for speaker identification."""

    user_id: str = Field(
        ...,
        min_length=1,
        max_length=128,
        description="User ID to match against (the enrolled owner)",
    )
    segments: list[IdentifySegment] = Field(
        ...,
        min_length=1,
        description="List of audio segments to identify",
    )
