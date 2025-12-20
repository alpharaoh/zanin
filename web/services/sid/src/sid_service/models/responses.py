"""Response models for the SID API."""

from typing import Literal

from pydantic import BaseModel, Field


class EnrollResponse(BaseModel):
    """Response from speaker enrollment."""

    success: bool = Field(..., description="Whether enrollment was successful")
    user_id: str = Field(..., description="User ID that was enrolled")
    audio_duration_seconds: float = Field(
        ...,
        description="Duration of audio used for enrollment",
    )
    embedding_dimension: int = Field(
        default=192,
        description="Dimension of the speaker embedding",
    )
    message: str | None = Field(
        default=None,
        description="Additional message (e.g., warnings)",
    )


class IdentifiedSegment(BaseModel):
    """A segment with speaker identification result."""

    speaker: int = Field(..., description="Original speaker ID from diarization")
    start: float = Field(..., description="Start time in seconds")
    end: float = Field(..., description="End time in seconds")
    identity: Literal["owner", "other"] = Field(
        ...,
        description="Identified speaker: 'owner' if matches enrolled user, 'other' otherwise",
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Confidence score (cosine similarity, higher = more confident)",
    )


class IdentifyResponse(BaseModel):
    """Response from speaker identification."""

    success: bool = Field(..., description="Whether identification was successful")
    segments: list[IdentifiedSegment] = Field(
        ...,
        description="Segments with identification results",
    )
    owner_speaking_seconds: float = Field(
        ...,
        description="Total time the owner was speaking",
    )
    other_speaking_seconds: float = Field(
        ...,
        description="Total time others were speaking",
    )


class ProfileInfoResponse(BaseModel):
    """Response with profile information."""

    exists: bool = Field(..., description="Whether the profile exists")
    user_id: str = Field(..., description="User ID")
    embedding_dimension: int | None = Field(
        default=None,
        description="Dimension of the speaker embedding",
    )
    created_at: float | None = Field(
        default=None,
        description="Unix timestamp when profile was created",
    )


class HealthResponse(BaseModel):
    """Health check response."""

    status: Literal["healthy", "unhealthy"] = Field(
        ...,
        description="Service health status",
    )
    model_loaded: bool = Field(
        ...,
        description="Whether the ECAPA-TDNN model is loaded",
    )
    profiles_dir_writable: bool = Field(
        ...,
        description="Whether the profiles directory is writable",
    )
    version: str = Field(..., description="Service version")
