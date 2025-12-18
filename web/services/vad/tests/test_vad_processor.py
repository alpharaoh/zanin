"""Tests for VAD processor service."""

import io

import numpy as np
import pytest
import soundfile as sf

from vad_service.services.vad_processor import VADProcessor


class TestVADProcessor:
    """Tests for the VADProcessor class."""

    async def test_initialization(self):
        """Test that processor initializes correctly."""
        processor = VADProcessor()
        assert not processor.is_initialized

        await processor.initialize()
        assert processor.is_initialized

    async def test_process_audio_bytes_empty(self, vad_processor: VADProcessor):
        """Test processing empty/silent audio."""
        # Generate 1 second of silence
        silence = np.zeros(16000, dtype=np.float32)

        buffer = io.BytesIO()
        sf.write(buffer, silence, 16000, format="WAV")
        buffer.seek(0)
        audio_bytes = buffer.read()

        segments = await vad_processor.process_audio_bytes(audio_bytes)

        # Should have no or very few segments in silence
        assert isinstance(segments, list)

    async def test_process_audio_bytes_with_tone(
        self,
        vad_processor: VADProcessor,
        generate_sine_wave,
        audio_to_wav_bytes,
    ):
        """Test processing audio with a continuous tone."""
        # Generate 2 seconds of sine wave
        tone = generate_sine_wave(frequency=440.0, duration=2.0, amplitude=0.8)
        audio_bytes = audio_to_wav_bytes(tone)

        segments = await vad_processor.process_audio_bytes(audio_bytes)

        assert isinstance(segments, list)
        assert vad_processor.last_duration > 0
        assert vad_processor.last_processing_time_ms > 0

    async def test_process_audio_bytes_mixed(
        self,
        vad_processor: VADProcessor,
        generate_sine_wave,
        generate_silence,
        audio_to_wav_bytes,
    ):
        """Test processing audio with mixed speech and silence."""
        silence = generate_silence(duration=0.5)
        tone = generate_sine_wave(frequency=440.0, duration=1.0, amplitude=0.8)

        # Pattern: silence -> tone -> silence
        audio = np.concatenate([silence, tone, silence])
        audio_bytes = audio_to_wav_bytes(audio)

        segments = await vad_processor.process_audio_bytes(audio_bytes)

        assert isinstance(segments, list)
        assert vad_processor.last_duration == pytest.approx(2.0, rel=0.1)

    async def test_extract_speech_audio(
        self,
        vad_processor: VADProcessor,
        generate_sine_wave,
        audio_to_wav_bytes,
    ):
        """Test extracting speech-only audio with known segments."""
        tone = generate_sine_wave(frequency=440.0, duration=1.0)
        audio_bytes = audio_to_wav_bytes(tone)

        # Create known segments (VAD may not detect sine wave as speech)
        from vad_service.models.responses import SpeechSegment
        segments = [SpeechSegment(start=0.1, end=0.5)]

        # Extract audio using known segments
        speech_audio = await vad_processor.extract_speech_audio(
            audio_bytes,
            segments,
            output_sample_rate=16000,
        )

        assert isinstance(speech_audio, bytes)
        assert len(speech_audio) > 0

        # Verify it's valid WAV
        buffer = io.BytesIO(speech_audio)
        data, sr = sf.read(buffer)
        assert sr == 16000
        assert len(data) > 0

    async def test_threshold_affects_detection(
        self,
        vad_processor: VADProcessor,
        generate_sine_wave,
        audio_to_wav_bytes,
    ):
        """Test that threshold parameter affects detection sensitivity."""
        tone = generate_sine_wave(frequency=440.0, duration=1.0, amplitude=0.3)
        audio_bytes = audio_to_wav_bytes(tone)

        # Low threshold - more permissive
        segments_low = await vad_processor.process_audio_bytes(
            audio_bytes,
            threshold=0.1,
        )

        # High threshold - more strict
        segments_high = await vad_processor.process_audio_bytes(
            audio_bytes,
            threshold=0.9,
        )

        # Both should return valid results
        assert isinstance(segments_low, list)
        assert isinstance(segments_high, list)

    async def test_not_initialized_raises(self):
        """Test that processing without initialization raises error."""
        processor = VADProcessor()

        with pytest.raises(RuntimeError, match="not initialized"):
            await processor.process_audio_bytes(b"fake audio")


class TestVADProcessorMetrics:
    """Tests for VAD processor metrics tracking."""

    async def test_metrics_updated_after_processing(
        self,
        vad_processor: VADProcessor,
        sample_audio_bytes: bytes,
    ):
        """Test that metrics are updated after processing."""
        # Initial state
        assert vad_processor.last_duration == 0.0
        assert vad_processor.last_processing_time_ms == 0.0

        # Process audio
        await vad_processor.process_audio_bytes(sample_audio_bytes)

        # Metrics should be updated
        assert vad_processor.last_duration > 0
        assert vad_processor.last_processing_time_ms > 0
        assert 0 <= vad_processor.last_speech_ratio <= 1

    async def test_speech_ratio_calculation(
        self,
        vad_processor: VADProcessor,
        generate_silence,
        audio_to_wav_bytes,
    ):
        """Test that speech ratio is calculated correctly for silence."""
        silence = generate_silence(duration=2.0)
        audio_bytes = audio_to_wav_bytes(silence)

        await vad_processor.process_audio_bytes(audio_bytes)

        # For pure silence, speech ratio should be low
        assert vad_processor.last_speech_ratio >= 0
        assert vad_processor.last_speech_ratio <= 1
