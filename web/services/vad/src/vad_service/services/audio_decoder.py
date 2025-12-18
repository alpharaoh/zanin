"""Audio decoder service for handling various audio formats."""

import asyncio
import io
import subprocess
import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf
import structlog

logger = structlog.get_logger(__name__)


class AudioDecoder:
    """
    Audio decoder that handles various formats and converts to PCM.

    Supports:
    - Native formats via soundfile: WAV, FLAC, OGG
    - FFmpeg fallback for: MP3, M4A, AAC, etc.
    """

    NATIVE_FORMATS = {".wav", ".flac", ".ogg"}

    def __init__(
        self,
        target_sample_rate: int = 16000,
        target_channels: int = 1,
    ) -> None:
        """
        Initialize audio decoder.

        Args:
            target_sample_rate: Target sample rate for output
            target_channels: Target number of channels (1 for mono)
        """
        self.target_sample_rate = target_sample_rate
        self.target_channels = target_channels

    async def decode(self, audio_data: bytes, filename: str = "") -> np.ndarray:
        """
        Decode audio bytes to numpy array.

        Args:
            audio_data: Raw audio file bytes
            filename: Optional filename to help detect format

        Returns:
            Numpy array of audio samples (float32, mono)
        """
        # Try to determine format from filename extension
        ext = Path(filename).suffix.lower() if filename else ""

        loop = asyncio.get_event_loop()

        if ext in self.NATIVE_FORMATS or not ext:
            # Try native decoding first
            try:
                return await loop.run_in_executor(
                    None,
                    lambda: self._decode_native(audio_data),
                )
            except Exception:
                if ext:
                    # Re-raise if we expected native format to work
                    raise
                # Fall through to FFmpeg for unknown formats

        # Use FFmpeg for other formats
        return await loop.run_in_executor(
            None,
            lambda: self._decode_ffmpeg(audio_data),
        )

    async def decode_file(self, filepath: str | Path) -> np.ndarray:
        """
        Decode audio file to numpy array.

        Args:
            filepath: Path to audio file

        Returns:
            Numpy array of audio samples (float32, mono)
        """
        filepath = Path(filepath)
        ext = filepath.suffix.lower()

        loop = asyncio.get_event_loop()

        if ext in self.NATIVE_FORMATS:
            return await loop.run_in_executor(
                None,
                lambda: self._decode_native_file(str(filepath)),
            )
        else:
            return await loop.run_in_executor(
                None,
                lambda: self._decode_ffmpeg_file(str(filepath)),
            )

    def _decode_native(self, audio_data: bytes) -> np.ndarray:
        """Decode audio using soundfile."""
        buffer = io.BytesIO(audio_data)
        audio_array, sample_rate = sf.read(buffer, dtype="float32")

        return self._normalize(audio_array, sample_rate)

    def _decode_native_file(self, filepath: str) -> np.ndarray:
        """Decode audio file using soundfile."""
        audio_array, sample_rate = sf.read(filepath, dtype="float32")

        return self._normalize(audio_array, sample_rate)

    def _decode_ffmpeg(self, audio_data: bytes) -> np.ndarray:
        """Decode audio using FFmpeg subprocess."""
        with tempfile.NamedTemporaryFile(suffix=".audio", delete=True) as tmp_in:
            tmp_in.write(audio_data)
            tmp_in.flush()

            return self._decode_ffmpeg_file(tmp_in.name)

    def _decode_ffmpeg_file(self, filepath: str) -> np.ndarray:
        """Decode audio file using FFmpeg subprocess."""
        cmd = [
            "ffmpeg",
            "-i",
            filepath,
            "-f",
            "f32le",
            "-acodec",
            "pcm_f32le",
            "-ac",
            str(self.target_channels),
            "-ar",
            str(self.target_sample_rate),
            "-",
        ]

        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                check=True,
            )

            audio_array = np.frombuffer(result.stdout, dtype=np.float32)

            logger.debug(
                "FFmpeg decode complete",
                samples=len(audio_array),
                duration_s=len(audio_array) / self.target_sample_rate,
            )

            return audio_array

        except subprocess.CalledProcessError as e:
            logger.error(
                "FFmpeg decode failed",
                stderr=e.stderr.decode() if e.stderr else "",
            )
            raise RuntimeError(f"Failed to decode audio: {e.stderr.decode()}")
        except FileNotFoundError:
            logger.error("FFmpeg not found")
            raise RuntimeError(
                "FFmpeg not found. Install FFmpeg to decode non-WAV formats."
            )

    def _normalize(
        self,
        audio_array: np.ndarray,
        sample_rate: int,
    ) -> np.ndarray:
        """Normalize audio to target sample rate and channels."""
        # Convert stereo to mono
        if len(audio_array.shape) > 1 and audio_array.shape[1] > 1:
            audio_array = np.mean(audio_array, axis=1)

        # Resample if necessary
        if sample_rate != self.target_sample_rate:
            audio_array = self._resample(
                audio_array,
                sample_rate,
                self.target_sample_rate,
            )

        return audio_array.astype(np.float32)

    def _resample(
        self,
        audio: np.ndarray,
        orig_sr: int,
        target_sr: int,
    ) -> np.ndarray:
        """Simple resampling using linear interpolation."""
        if orig_sr == target_sr:
            return audio

        duration = len(audio) / orig_sr
        target_length = int(duration * target_sr)

        indices = np.linspace(0, len(audio) - 1, target_length)
        resampled = np.interp(indices, np.arange(len(audio)), audio)

        return resampled


class StreamingAudioDecoder:
    """
    Streaming audio decoder that processes chunks without loading full file.

    Uses FFmpeg subprocess with pipe I/O for memory efficiency.
    """

    def __init__(
        self,
        target_sample_rate: int = 16000,
        target_channels: int = 1,
    ) -> None:
        self.target_sample_rate = target_sample_rate
        self.target_channels = target_channels
        self._process: subprocess.Popen | None = None
        self._buffer = b""

    async def start(self) -> None:
        """Start the FFmpeg decoding process."""
        cmd = [
            "ffmpeg",
            "-i",
            "pipe:0",  # Read from stdin
            "-f",
            "f32le",
            "-acodec",
            "pcm_f32le",
            "-ac",
            str(self.target_channels),
            "-ar",
            str(self.target_sample_rate),
            "pipe:1",  # Write to stdout
        ]

        self._process = subprocess.Popen(
            cmd,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
        )

    async def feed(self, chunk: bytes) -> np.ndarray | None:
        """
        Feed audio chunk and get decoded samples if available.

        Args:
            chunk: Raw audio bytes

        Returns:
            Numpy array of decoded samples, or None if not enough data yet
        """
        if self._process is None:
            raise RuntimeError("Decoder not started. Call start() first.")

        # Write chunk to FFmpeg stdin
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None,
            lambda: self._process.stdin.write(chunk),  # type: ignore
        )

        # Try to read available output
        # Note: This is simplified - production code would need proper async I/O
        return None

    async def finalize(self) -> np.ndarray | None:
        """
        Finalize decoding and get remaining samples.

        Returns:
            Remaining decoded samples, or None if none available
        """
        if self._process is None:
            return None

        # Close stdin to signal EOF
        self._process.stdin.close()  # type: ignore

        # Read remaining output
        loop = asyncio.get_event_loop()
        output = await loop.run_in_executor(
            None,
            lambda: self._process.stdout.read(),  # type: ignore
        )

        self._process.wait()
        self._process = None

        if output:
            return np.frombuffer(output, dtype=np.float32)

        return None
