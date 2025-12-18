"""Pytest fixtures for VAD service tests."""

import io
from collections.abc import AsyncGenerator

import numpy as np
import pytest
import soundfile as sf
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from vad_service.api.dependencies import set_vad_processor
from vad_service.main import create_app
from vad_service.services.vad_processor import VADProcessor


@pytest.fixture
def sample_rate() -> int:
    """Default sample rate for test audio."""
    return 16000


@pytest.fixture
def audio_duration() -> float:
    """Default duration for test audio in seconds."""
    return 2.0


@pytest.fixture
def generate_sine_wave(sample_rate: int):
    """Factory fixture to generate sine wave audio."""

    def _generate(
        frequency: float = 440.0,
        duration: float = 1.0,
        amplitude: float = 0.5,
    ) -> np.ndarray:
        t = np.linspace(0, duration, int(sample_rate * duration), dtype=np.float32)
        return amplitude * np.sin(2 * np.pi * frequency * t)

    return _generate


@pytest.fixture
def generate_silence(sample_rate: int):
    """Factory fixture to generate silence."""

    def _generate(duration: float = 1.0) -> np.ndarray:
        return np.zeros(int(sample_rate * duration), dtype=np.float32)

    return _generate


@pytest.fixture
def audio_to_wav_bytes(sample_rate: int):
    """Factory fixture to convert audio array to WAV bytes."""

    def _convert(audio: np.ndarray) -> bytes:
        buffer = io.BytesIO()
        sf.write(buffer, audio, sample_rate, format="WAV")
        buffer.seek(0)
        return buffer.read()

    return _convert


@pytest.fixture
def sample_audio_bytes(
    generate_sine_wave,
    generate_silence,
    audio_to_wav_bytes,
    audio_duration: float,
) -> bytes:
    """
    Generate sample audio with speech-like pattern.

    Pattern: silence -> tone -> silence -> tone
    """
    silence = generate_silence(duration=0.3)
    tone = generate_sine_wave(frequency=440.0, duration=0.7)

    # Create pattern: silence, tone, silence, tone
    audio = np.concatenate([
        silence,
        tone,
        silence,
        tone,
    ])

    return audio_to_wav_bytes(audio)


@pytest.fixture
async def vad_processor() -> AsyncGenerator[VADProcessor, None]:
    """Create and initialize a VAD processor for tests."""
    processor = VADProcessor()
    await processor.initialize()
    yield processor


@pytest.fixture
def app(vad_processor: VADProcessor) -> FastAPI:
    """Create test FastAPI application."""
    app = create_app()
    set_vad_processor(vad_processor)
    return app


@pytest.fixture
async def client(app: FastAPI) -> AsyncGenerator[AsyncClient, None]:
    """Create async HTTP client for testing."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        yield client
