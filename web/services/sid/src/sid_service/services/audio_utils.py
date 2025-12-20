"""Audio processing utilities."""

import os
import subprocess
import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf

from ..core.logging import get_logger

logger = get_logger(__name__)

# Supported audio formats
SUPPORTED_FORMATS = {".wav", ".mp3", ".flac", ".ogg", ".m4a"}

# Formats that need ffmpeg conversion (not supported by libsndfile)
NEEDS_CONVERSION = {".m4a", ".aac", ".mp3", ".webm"}


class AudioUtils:
    """Utilities for audio processing and manipulation."""

    @staticmethod
    def _needs_conversion(audio_path: str) -> bool:
        """Check if the file format needs ffmpeg conversion."""
        suffix = Path(audio_path).suffix.lower()
        return suffix in NEEDS_CONVERSION

    @staticmethod
    def convert_to_wav(audio_path: str) -> str:
        """
        Convert audio to WAV format using ffmpeg.

        Args:
            audio_path: Path to the input audio file

        Returns:
            Path to the converted WAV file (temp file)
        """
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
            output_path = f.name

        try:
            result = subprocess.run(
                [
                    "ffmpeg",
                    "-i", audio_path,
                    "-ar", "16000",  # Resample to 16kHz
                    "-ac", "1",      # Convert to mono
                    "-f", "wav",
                    "-y",            # Overwrite output
                    output_path,
                ],
                capture_output=True,
                text=True,
                check=True,
            )
            logger.debug("Converted audio to WAV", input=audio_path, output=output_path)
            return output_path
        except subprocess.CalledProcessError as e:
            # Clean up on failure
            if os.path.exists(output_path):
                os.remove(output_path)
            raise RuntimeError(f"ffmpeg conversion failed: {e.stderr}") from e

    @staticmethod
    def get_audio_duration(audio_path: str) -> float:
        """
        Get the duration of an audio file in seconds.

        Args:
            audio_path: Path to the audio file

        Returns:
            Duration in seconds
        """
        wav_path = None
        try:
            if AudioUtils._needs_conversion(audio_path):
                wav_path = AudioUtils.convert_to_wav(audio_path)
                audio_path = wav_path
            info = sf.info(audio_path)
            return info.duration
        finally:
            if wav_path and os.path.exists(wav_path):
                os.remove(wav_path)

    @staticmethod
    def load_audio(
        audio_path: str, target_sample_rate: int = 16000
    ) -> tuple[np.ndarray, int]:
        """
        Load audio from file and optionally resample.

        Args:
            audio_path: Path to the audio file
            target_sample_rate: Target sample rate (default: 16000)

        Returns:
            Tuple of (waveform, sample_rate)
        """
        wav_path = None
        try:
            # Convert if needed (ffmpeg handles resampling to 16kHz)
            if AudioUtils._needs_conversion(audio_path):
                wav_path = AudioUtils.convert_to_wav(audio_path)
                audio_path = wav_path

            waveform, sample_rate = sf.read(audio_path)

            # Convert stereo to mono
            if waveform.ndim > 1:
                waveform = np.mean(waveform, axis=1)

            # Resample if needed (usually already done by ffmpeg)
            if sample_rate != target_sample_rate:
                import torch
                import torchaudio

                waveform_tensor = torch.from_numpy(waveform).unsqueeze(0).float()
                resampler = torchaudio.transforms.Resample(
                    orig_freq=sample_rate, new_freq=target_sample_rate
                )
                waveform = resampler(waveform_tensor).squeeze().numpy()
                sample_rate = target_sample_rate

            return waveform, sample_rate
        finally:
            if wav_path and os.path.exists(wav_path):
                os.remove(wav_path)

    @staticmethod
    def extract_segment(
        audio_path: str,
        start_seconds: float,
        end_seconds: float,
        target_sample_rate: int = 16000,
    ) -> np.ndarray:
        """
        Extract a segment from an audio file.

        Args:
            audio_path: Path to the audio file
            start_seconds: Start time in seconds
            end_seconds: End time in seconds
            target_sample_rate: Target sample rate

        Returns:
            Audio segment as numpy array
        """
        waveform, sample_rate = AudioUtils.load_audio(audio_path, target_sample_rate)

        start_sample = int(start_seconds * target_sample_rate)
        end_sample = int(end_seconds * target_sample_rate)

        # Clamp to valid range
        start_sample = max(0, start_sample)
        end_sample = min(len(waveform), end_sample)

        return waveform[start_sample:end_sample]

    @staticmethod
    def save_temp_audio(audio_bytes: bytes, suffix: str = ".wav") -> str:
        """
        Save audio bytes to a temporary file.

        Args:
            audio_bytes: Audio data as bytes
            suffix: File extension

        Returns:
            Path to the temporary file
        """
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as f:
            f.write(audio_bytes)
            return f.name

    @staticmethod
    def validate_audio_format(filename: str) -> bool:
        """Check if the file has a supported audio format."""
        suffix = Path(filename).suffix.lower()
        return suffix in SUPPORTED_FORMATS

    @staticmethod
    def get_audio_info(audio_path: str) -> dict:
        """
        Get information about an audio file.

        Args:
            audio_path: Path to the audio file

        Returns:
            Dict with audio info (duration, sample_rate, channels, etc.)
        """
        wav_path = None
        try:
            original_path = audio_path
            if AudioUtils._needs_conversion(audio_path):
                wav_path = AudioUtils.convert_to_wav(audio_path)
                audio_path = wav_path

            info = sf.info(audio_path)
            return {
                "duration_seconds": info.duration,
                "sample_rate": info.samplerate,
                "channels": info.channels,
                "frames": info.frames,
                "format": info.format,
                "subtype": info.subtype,
                "original_path": original_path,
            }
        finally:
            if wav_path and os.path.exists(wav_path):
                os.remove(wav_path)
