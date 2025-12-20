"""Speaker identification endpoints."""

import os
import tempfile

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from sid_service.api.dependencies import get_profile_store, get_speaker_encoder
from sid_service.core.config import settings
from sid_service.core.logging import get_logger
from sid_service.models.requests import IdentifyParams, IdentifySegment
from sid_service.models.responses import (
    EnrollResponse,
    IdentifiedSegment,
    IdentifyResponse,
    ProfileInfoResponse,
)
from sid_service.services.audio_utils import AudioUtils
from sid_service.services.profile_store import ProfileStore
from sid_service.services.speaker_encoder import SpeakerEncoder

router = APIRouter(prefix="/api/v1/sid", tags=["Speaker Identification"])
logger = get_logger(__name__)


@router.post("/enroll", response_model=EnrollResponse)
async def enroll_speaker(
    user_id: str = Form(..., min_length=1, max_length=128),
    audio: UploadFile = File(...),
    encoder: SpeakerEncoder = Depends(get_speaker_encoder),
    store: ProfileStore = Depends(get_profile_store),
) -> EnrollResponse:
    """
    Enroll a speaker's voice profile.

    Upload an audio file (WAV, MP3, FLAC, etc.) with at least 10 seconds
    of clear speech from the speaker. The audio will be processed to
    create a unique voice profile for future identification.
    """
    # Validate file format
    if audio.filename and not AudioUtils.validate_audio_format(audio.filename):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported audio format. Supported: WAV, MP3, FLAC, OGG, M4A",
        )

    # Save uploaded file temporarily
    audio_bytes = await audio.read()
    temp_path = None

    try:
        # Get file extension from filename
        suffix = ".wav"
        if audio.filename:
            suffix = os.path.splitext(audio.filename)[1] or ".wav"

        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as f:
            f.write(audio_bytes)
            temp_path = f.name

        # Get audio info
        audio_info = AudioUtils.get_audio_info(temp_path)
        duration = audio_info["duration_seconds"]

        # Validate duration
        if duration < settings.min_audio_duration_seconds:
            raise HTTPException(
                status_code=400,
                detail=f"Audio too short. Minimum duration: {settings.min_audio_duration_seconds}s, got: {duration:.1f}s",
            )

        # Warn if short
        message = None
        if duration < 10.0:
            message = (
                f"Audio is only {duration:.1f}s. "
                "For best results, use 30+ seconds of speech."
            )

        logger.info(
            "Enrolling speaker",
            user_id=user_id,
            duration_seconds=duration,
        )

        # Extract embedding
        embedding = encoder.encode_file(temp_path)

        # Save profile
        store.save(user_id, embedding)

        logger.info(
            "Speaker enrolled successfully",
            user_id=user_id,
            embedding_shape=embedding.shape,
        )

        return EnrollResponse(
            success=True,
            user_id=user_id,
            audio_duration_seconds=duration,
            embedding_dimension=embedding.shape[0],
            message=message,
        )

    finally:
        # Clean up temp file
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)


@router.post("/identify", response_model=IdentifyResponse)
async def identify_speakers(
    user_id: str = Form(..., min_length=1, max_length=128),
    segments: str = Form(..., description="JSON array of segments"),
    audio: UploadFile = File(...),
    encoder: SpeakerEncoder = Depends(get_speaker_encoder),
    store: ProfileStore = Depends(get_profile_store),
) -> IdentifyResponse:
    """
    Identify speakers in audio segments.

    Given an audio file and a list of speaker segments (from diarization),
    determine which segments belong to the enrolled user ("owner") and
    which belong to others.
    """
    import json

    # Parse segments JSON
    try:
        segments_data = json.loads(segments)
        parsed_segments = [IdentifySegment(**s) for s in segments_data]
    except (json.JSONDecodeError, ValueError) as e:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid segments JSON: {e}",
        )

    # Load user profile
    reference_embedding = store.load(user_id)
    if reference_embedding is None:
        raise HTTPException(
            status_code=404,
            detail=f"No voice profile found for user: {user_id}",
        )

    # Validate file format
    if audio.filename and not AudioUtils.validate_audio_format(audio.filename):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported audio format. Supported: WAV, MP3, FLAC, OGG, M4A",
        )

    # Save uploaded file temporarily
    audio_bytes = await audio.read()
    temp_path = None

    try:
        suffix = ".wav"
        if audio.filename:
            suffix = os.path.splitext(audio.filename)[1] or ".wav"

        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as f:
            f.write(audio_bytes)
            temp_path = f.name

        logger.info(
            "Identifying speakers",
            user_id=user_id,
            num_segments=len(parsed_segments),
        )

        # Process each unique speaker
        speaker_embeddings: dict[int, list] = {}

        for segment in parsed_segments:
            if segment.speaker not in speaker_embeddings:
                speaker_embeddings[segment.speaker] = []

            # Extract audio segment
            segment_audio = AudioUtils.extract_segment(
                temp_path,
                segment.start,
                segment.end,
            )

            # Check if segment is long enough
            segment_duration = segment.end - segment.start
            if segment_duration >= settings.min_audio_duration_seconds:
                embedding = encoder.encode_waveform(segment_audio)
                speaker_embeddings[segment.speaker].append(embedding)

        # Average embeddings per speaker and compare
        speaker_identities: dict[int, tuple[str, float]] = {}

        for speaker_id, embeddings in speaker_embeddings.items():
            if embeddings:
                # Average all embeddings for this speaker
                import numpy as np

                avg_embedding = np.mean(embeddings, axis=0)

                # Compare against reference
                is_owner, confidence = encoder.verify(
                    avg_embedding,
                    reference_embedding,
                    settings.similarity_threshold,
                )

                identity = "owner" if is_owner else "other"
                speaker_identities[speaker_id] = (identity, confidence)

                logger.debug(
                    "Speaker identified",
                    speaker_id=speaker_id,
                    identity=identity,
                    confidence=confidence,
                )
            else:
                # Not enough audio for this speaker
                speaker_identities[speaker_id] = ("other", 0.0)

        # Build response
        identified_segments = []
        owner_time = 0.0
        other_time = 0.0

        for segment in parsed_segments:
            identity, confidence = speaker_identities.get(
                segment.speaker, ("other", 0.0)
            )
            duration = segment.end - segment.start

            if identity == "owner":
                owner_time += duration
            else:
                other_time += duration

            identified_segments.append(
                IdentifiedSegment(
                    speaker=segment.speaker,
                    start=segment.start,
                    end=segment.end,
                    identity=identity,
                    confidence=confidence,
                )
            )

        logger.info(
            "Speaker identification complete",
            owner_speaking_seconds=owner_time,
            other_speaking_seconds=other_time,
        )

        return IdentifyResponse(
            success=True,
            segments=identified_segments,
            owner_speaking_seconds=owner_time,
            other_speaking_seconds=other_time,
        )

    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)


@router.get("/profiles/{user_id}", response_model=ProfileInfoResponse)
async def get_profile(
    user_id: str,
    store: ProfileStore = Depends(get_profile_store),
) -> ProfileInfoResponse:
    """
    Get information about a user's voice profile.
    """
    profile_info = store.get_profile_info(user_id)

    if profile_info is None:
        return ProfileInfoResponse(
            exists=False,
            user_id=user_id,
        )

    return ProfileInfoResponse(
        exists=True,
        user_id=user_id,
        embedding_dimension=profile_info["embedding_dimension"],
        created_at=profile_info["created_at"],
    )


@router.delete("/profiles/{user_id}")
async def delete_profile(
    user_id: str,
    store: ProfileStore = Depends(get_profile_store),
) -> dict:
    """
    Delete a user's voice profile.
    """
    deleted = store.delete(user_id)

    if not deleted:
        raise HTTPException(
            status_code=404,
            detail=f"No voice profile found for user: {user_id}",
        )

    return {"success": True, "user_id": user_id, "message": "Profile deleted"}
