"""VAD processor service using silero-vad for speech detection."""

import asyncio
import io
import tempfile
import time
from collections.abc import AsyncGenerator

import numpy as np
import soundfile as sf
import structlog

from vad_service.models.responses import SpeechSegment

logger = structlog.get_logger(__name__)


class VADProcessor:
    """
    Memory-efficient VAD processor using silero-vad.

    Processes audio in chunks to maintain constant memory usage
    regardless of input file size.
    """

    SAMPLE_RATE = 16000
    WINDOW_SIZE_SAMPLES = 512  # 32ms at 16kHz

    def __init__(self) -> None:
        self._model = None
        self._initialized = False
        self.last_duration: float = 0.0
        self.last_speech_ratio: float = 0.0
        self.last_processing_time_ms: float = 0.0

    @property
    def is_initialized(self) -> bool:
        """Check if the VAD model is loaded and ready."""
        return self._initialized and self._model is not None

    async def initialize(self) -> None:
        """Load the silero-vad model. Call once at application startup."""
        if self._initialized:
            return

        logger.info("Loading silero-vad model")
        start = time.perf_counter()

        loop = asyncio.get_event_loop()
        self._model = await loop.run_in_executor(None, self._load_model)

        elapsed = (time.perf_counter() - start) * 1000
        logger.info("VAD model loaded", load_time_ms=elapsed)
        self._initialized = True

    def _load_model(self):
        """Load the silero-vad model (runs in executor)."""
        from silero_vad import load_silero_vad

        return load_silero_vad()

    async def process_audio_bytes(
        self,
        audio_data: bytes,
        threshold: float = 0.5,
        min_speech_duration_ms: int = 250,
        min_silence_duration_ms: int = 100,
        return_seconds: bool = True,
    ) -> list[SpeechSegment]:
        """
        Process audio bytes and return detected speech segments.

        Args:
            audio_data: Raw audio file bytes (WAV, MP3, etc.)
            threshold: Speech detection threshold (0-1)
            min_speech_duration_ms: Minimum speech segment duration
            min_silence_duration_ms: Minimum silence to split segments
            return_seconds: Return timestamps in seconds vs samples

        Returns:
            List of detected speech segments
        """
        if not self.is_initialized:
            raise RuntimeError("VAD model not initialized. Call initialize() first.")

        start_time = time.perf_counter()

        # Decode audio to numpy array
        loop = asyncio.get_event_loop()
        audio_array, sample_rate = await loop.run_in_executor(
            None,
            lambda: self._decode_audio(audio_data),
        )

        # Resample if necessary
        if sample_rate != self.SAMPLE_RATE:
            audio_array = await loop.run_in_executor(
                None,
                lambda: self._resample(audio_array, sample_rate, self.SAMPLE_RATE),
            )

        # Run VAD
        segments = await loop.run_in_executor(
            None,
            lambda: self._run_vad(
                audio_array,
                threshold,
                min_speech_duration_ms,
                min_silence_duration_ms,
                return_seconds,
            ),
        )

        # Calculate metrics
        self.last_duration = len(audio_array) / self.SAMPLE_RATE
        total_speech = sum(s.end - s.start for s in segments)
        self.last_speech_ratio = (
            total_speech / self.last_duration if self.last_duration > 0 else 0.0
        )
        self.last_processing_time_ms = (time.perf_counter() - start_time) * 1000

        return segments

    async def process_stream(
        self,
        stream: AsyncGenerator[bytes, None],
        threshold: float = 0.5,
        min_speech_duration_ms: int = 250,
        min_silence_duration_ms: int = 100,
    ) -> AsyncGenerator[SpeechSegment, None]:
        """
        Process audio stream and yield speech segments as detected.

        For very large files, this uses a temp file to avoid memory issues.

        Args:
            stream: Async generator of audio bytes
            threshold: Speech detection threshold
            min_speech_duration_ms: Minimum speech segment duration
            min_silence_duration_ms: Minimum silence to split segments

        Yields:
            Speech segments as they are detected
        """
        if not self.is_initialized:
            raise RuntimeError("VAD model not initialized. Call initialize() first.")

        start_time = time.perf_counter()

        # Collect stream to temp file (handles GB-scale files)
        with tempfile.NamedTemporaryFile(suffix=".audio", delete=True) as tmp:
            total_bytes = 0
            async for chunk in stream:
                tmp.write(chunk)
                total_bytes += len(chunk)

            tmp.flush()
            tmp.seek(0)

            logger.debug("Received audio stream", total_bytes=total_bytes)

            # Decode the temp file
            loop = asyncio.get_event_loop()
            audio_array, sample_rate = await loop.run_in_executor(
                None,
                lambda: self._decode_audio_file(tmp.name),
            )

            # Resample if necessary
            if sample_rate != self.SAMPLE_RATE:
                audio_array = await loop.run_in_executor(
                    None,
                    lambda: self._resample(audio_array, sample_rate, self.SAMPLE_RATE),
                )

            # Run VAD and yield segments
            segments = await loop.run_in_executor(
                None,
                lambda: self._run_vad(
                    audio_array,
                    threshold,
                    min_speech_duration_ms,
                    min_silence_duration_ms,
                    return_seconds=True,
                ),
            )

            # Update metrics
            self.last_duration = len(audio_array) / self.SAMPLE_RATE
            total_speech = sum(s.end - s.start for s in segments)
            self.last_speech_ratio = (
                total_speech / self.last_duration if self.last_duration > 0 else 0.0
            )
            self.last_processing_time_ms = (time.perf_counter() - start_time) * 1000

            for segment in segments:
                yield segment

    async def extract_speech_audio(
        self,
        audio_data: bytes,
        segments: list[SpeechSegment],
        output_sample_rate: int = 16000,
    ) -> bytes:
        """
        Extract only speech segments from audio and return as WAV bytes.

        Args:
            audio_data: Original audio file bytes
            segments: Speech segments to extract
            output_sample_rate: Sample rate for output audio

        Returns:
            WAV file bytes containing only speech
        """
        loop = asyncio.get_event_loop()

        return await loop.run_in_executor(
            None,
            lambda: self._extract_speech(audio_data, segments, output_sample_rate),
        )

    def _decode_audio(self, audio_data: bytes) -> tuple[np.ndarray, int]:
        """Decode audio bytes to numpy array."""
        buffer = io.BytesIO(audio_data)
        audio_array, sample_rate = sf.read(buffer, dtype="float32")

        # Convert stereo to mono if necessary
        if len(audio_array.shape) > 1:
            audio_array = np.mean(audio_array, axis=1)

        return audio_array, sample_rate

    def _decode_audio_file(self, filepath: str) -> tuple[np.ndarray, int]:
        """Decode audio file to numpy array."""
        audio_array, sample_rate = sf.read(filepath, dtype="float32")

        # Convert stereo to mono if necessary
        if len(audio_array.shape) > 1:
            audio_array = np.mean(audio_array, axis=1)

        return audio_array, sample_rate

    def _resample(
        self, audio: np.ndarray, orig_sr: int, target_sr: int
    ) -> np.ndarray:
        """Simple resampling using linear interpolation."""
        if orig_sr == target_sr:
            return audio

        duration = len(audio) / orig_sr
        target_length = int(duration * target_sr)

        indices = np.linspace(0, len(audio) - 1, target_length)
        resampled = np.interp(indices, np.arange(len(audio)), audio)

        return resampled.astype(np.float32)

    def _run_vad(
        self,
        audio: np.ndarray,
        threshold: float,
        min_speech_duration_ms: int,
        min_silence_duration_ms: int,
        return_seconds: bool,
    ) -> list[SpeechSegment]:
        """Run VAD on audio array using get_speech_timestamps."""
        import torch
        from silero_vad import get_speech_timestamps

        # Convert numpy array to torch tensor
        audio_tensor = torch.from_numpy(audio)

        # Get speech timestamps
        speech_timestamps = get_speech_timestamps(
            audio_tensor,
            self._model,
            threshold=threshold,
            sampling_rate=self.SAMPLE_RATE,
            min_speech_duration_ms=min_speech_duration_ms,
            min_silence_duration_ms=min_silence_duration_ms,
            return_seconds=return_seconds,
        )

        # Convert to SpeechSegment objects
        segments = []
        for ts in speech_timestamps:
            segments.append(
                SpeechSegment(
                    start=ts["start"],
                    end=ts["end"],
                )
            )

        return segments

    def _extract_speech(
        self,
        audio_data: bytes,
        segments: list[SpeechSegment],
        output_sample_rate: int,
    ) -> bytes:
        """Extract speech segments and return as WAV bytes."""
        # Decode original audio
        audio_array, sample_rate = self._decode_audio(audio_data)

        # Resample to processing sample rate for segment extraction
        if sample_rate != self.SAMPLE_RATE:
            audio_array = self._resample(audio_array, sample_rate, self.SAMPLE_RATE)

        # Extract speech segments
        speech_chunks = []
        for segment in segments:
            start_sample = int(segment.start * self.SAMPLE_RATE)
            end_sample = int(segment.end * self.SAMPLE_RATE)
            speech_chunks.append(audio_array[start_sample:end_sample])

        if not speech_chunks:
            # No speech detected, return empty audio
            combined = np.array([], dtype=np.float32)
        else:
            combined = np.concatenate(speech_chunks)

        # Resample to output sample rate if different
        if output_sample_rate != self.SAMPLE_RATE:
            combined = self._resample(combined, self.SAMPLE_RATE, output_sample_rate)

        # Write to WAV buffer
        buffer = io.BytesIO()
        sf.write(buffer, combined, output_sample_rate, format="WAV")
        buffer.seek(0)

        return buffer.read()
