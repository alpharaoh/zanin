"""VAD detection endpoints."""

from collections.abc import AsyncGenerator

import structlog
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile
from fastapi.responses import Response, StreamingResponse

from vad_service.api.dependencies import get_vad_processor
from vad_service.core.config import settings
from vad_service.models.requests import VADParams
from vad_service.models.responses import VADResponse
from vad_service.services.vad_processor import VADProcessor

router = APIRouter(prefix="/api/v1/vad", tags=["VAD"])
logger = structlog.get_logger(__name__)


@router.post("/detect", response_model=VADResponse)
async def detect_speech(
    file: UploadFile,
    params: VADParams = Depends(),
    processor: VADProcessor = Depends(get_vad_processor),
) -> VADResponse:
    """
    Detect speech segments in an audio file.

    Upload an audio file and receive a JSON response with detected
    speech segment timestamps.

    Supported formats: WAV, MP3, FLAC, OGG, M4A, AAC (requires FFmpeg)
    """
    logger.info(
        "Processing VAD request",
        filename=file.filename,
        content_type=file.content_type,
    )

    # Read file content
    audio_data = await file.read()

    if len(audio_data) > settings.max_file_size_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is {settings.max_file_size_mb}MB",
        )

    try:
        segments = await processor.process_audio_bytes(
            audio_data,
            threshold=params.threshold,
            min_speech_duration_ms=params.min_speech_duration_ms,
            min_silence_duration_ms=params.min_silence_duration_ms,
            return_seconds=params.return_seconds,
        )

        return VADResponse(
            segments=segments,
            total_speech_duration=sum(s.end - s.start for s in segments),
            total_duration=processor.last_duration,
            speech_ratio=processor.last_speech_ratio,
            processing_time_ms=processor.last_processing_time_ms,
        )

    except Exception as e:
        logger.error("VAD processing failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Processing failed: {e}")


@router.post("/detect/audio")
async def detect_speech_audio(
    file: UploadFile,
    params: VADParams = Depends(),
    processor: VADProcessor = Depends(get_vad_processor),
) -> Response:
    """
    Detect speech and return audio with non-speech removed.

    Upload an audio file and receive a WAV file containing only
    the detected speech segments.

    Supported formats: WAV, MP3, FLAC, OGG, M4A, AAC (requires FFmpeg)
    """
    logger.info(
        "Processing VAD audio request",
        filename=file.filename,
        content_type=file.content_type,
    )

    # Read file content
    audio_data = await file.read()

    if len(audio_data) > settings.max_file_size_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is {settings.max_file_size_mb}MB",
        )

    try:
        # First detect speech segments
        segments = await processor.process_audio_bytes(
            audio_data,
            threshold=params.threshold,
            min_speech_duration_ms=params.min_speech_duration_ms,
            min_silence_duration_ms=params.min_silence_duration_ms,
            return_seconds=True,
        )

        # Extract speech audio
        speech_audio = await processor.extract_speech_audio(
            audio_data,
            segments,
            output_sample_rate=params.output_sample_rate,
        )

        # Determine output filename
        original_name = file.filename or "audio"
        if "." in original_name:
            base_name = original_name.rsplit(".", 1)[0]
        else:
            base_name = original_name
        output_filename = f"{base_name}_speech.wav"

        return Response(
            content=speech_audio,
            media_type="audio/wav",
            headers={
                "Content-Disposition": f'attachment; filename="{output_filename}"',
                "X-Speech-Duration": str(
                    sum(s.end - s.start for s in segments)
                ),
                "X-Total-Duration": str(processor.last_duration),
                "X-Speech-Ratio": str(processor.last_speech_ratio),
                "X-Processing-Time-Ms": str(processor.last_processing_time_ms),
            },
        )

    except Exception as e:
        logger.error("VAD audio processing failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Processing failed: {e}")


@router.post("/detect/stream")
async def detect_speech_streaming(
    request: Request,
    params: VADParams = Depends(),
    processor: VADProcessor = Depends(get_vad_processor),
) -> StreamingResponse:
    """
    Stream audio and receive speech segments as Server-Sent Events.

    Send audio data in the request body and receive speech segments
    as they are detected via SSE.

    This endpoint accepts raw audio bytes in the request body.
    """

    async def generate() -> AsyncGenerator[bytes, None]:
        try:
            async def request_stream() -> AsyncGenerator[bytes, None]:
                async for chunk in request.stream():
                    yield chunk

            async for segment in processor.process_stream(
                request_stream(),
                threshold=params.threshold,
                min_speech_duration_ms=params.min_speech_duration_ms,
                min_silence_duration_ms=params.min_silence_duration_ms,
            ):
                yield f"data: {segment.model_dump_json()}\n\n".encode()

            # Send completion message
            yield b'data: {"done": true}\n\n'

        except Exception as e:
            logger.error("Streaming VAD failed", error=str(e))
            yield f'data: {{"error": "{e}"}}\n\n'.encode()

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )
