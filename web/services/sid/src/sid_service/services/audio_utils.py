"""Audio processing utilities."""

import io
import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf

from ..core.logging import get_logger

logger = get_logger(__name__)

# Supported audio formats
SUPPORTED_FORMATS = {".wav", ".mp3", ".flac", ".ogg", ".m4a"}


class AudioUtils:
    """Utilities for audio processing and manipulation."""

    @staticmethod
    def get_audio_duration(audio_path: str) -> float:
        """
        Get the duration of an audio file in seconds.

        Args:
            audio_path: Path to the audio file

        Returns:
            Duration in seconds
        """
        info = sf.info(audio_path)
        return info.duration

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
        waveform, sample_rate = sf.read(audio_path)

        # Convert stereo to mono
        if waveform.ndim > 1:
            waveform = np.mean(waveform, axis=1)

        # Resample if needed
        if sample_rate != target_sample_rate:
            import torchaudio
            import torch

            waveform_tensor = torch.from_numpy(waveform).unsqueeze(0).float()
            resampler = torchaudio.transforms.Resample(
                orig_freq=sample_rate, new_freq=target_sample_rate
            )
            waveform = resampler(waveform_tensor).squeeze().numpy()
            sample_rate = target_sample_rate

        return waveform, sample_rate

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
        info = sf.info(audio_path)
        return {
            "duration_seconds": info.duration,
            "sample_rate": info.samplerate,
            "channels": info.channels,
            "frames": info.frames,
            "format": info.format,
            "subtype": info.subtype,
        }
