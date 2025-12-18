"""Tests for VAD API endpoints."""

from httpx import AsyncClient


class TestHealthEndpoints:
    """Tests for health check endpoints."""

    async def test_health_endpoint(self, client: AsyncClient):
        """Test basic health check returns healthy status."""
        response = await client.get("/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "version" in data
        assert data["model_loaded"] is True

    async def test_readiness_endpoint(self, client: AsyncClient):
        """Test readiness check returns ready status."""
        response = await client.get("/health/ready")

        assert response.status_code == 200
        data = response.json()
        assert data["ready"] is True
        assert "checks" in data
        assert data["checks"]["vad_model"] == "ok"

    async def test_liveness_endpoint(self, client: AsyncClient):
        """Test liveness check returns alive status."""
        response = await client.get("/health/live")

        assert response.status_code == 200
        data = response.json()
        assert data["alive"] is True


class TestVADEndpoints:
    """Tests for VAD detection endpoints."""

    async def test_detect_endpoint(
        self,
        client: AsyncClient,
        sample_audio_bytes: bytes,
    ):
        """Test VAD detect endpoint returns segments."""
        response = await client.post(
            "/api/v1/vad/detect",
            files={"file": ("test.wav", sample_audio_bytes, "audio/wav")},
        )

        assert response.status_code == 200
        data = response.json()

        assert "segments" in data
        assert isinstance(data["segments"], list)
        assert "total_speech_duration" in data
        assert "total_duration" in data
        assert "speech_ratio" in data
        assert "processing_time_ms" in data

        # Validate types
        assert isinstance(data["total_speech_duration"], float)
        assert isinstance(data["total_duration"], float)
        assert isinstance(data["processing_time_ms"], float)
        assert 0 <= data["speech_ratio"] <= 1

    async def test_detect_endpoint_with_params(
        self,
        client: AsyncClient,
        sample_audio_bytes: bytes,
    ):
        """Test VAD detect endpoint with custom parameters."""
        response = await client.post(
            "/api/v1/vad/detect",
            params={
                "threshold": 0.7,
                "min_speech_duration_ms": 300,
                "min_silence_duration_ms": 150,
            },
            files={"file": ("test.wav", sample_audio_bytes, "audio/wav")},
        )

        assert response.status_code == 200
        data = response.json()
        assert "segments" in data

    async def test_detect_audio_endpoint(
        self,
        client: AsyncClient,
        sample_audio_bytes: bytes,
    ):
        """Test VAD detect audio endpoint returns WAV file."""
        response = await client.post(
            "/api/v1/vad/detect/audio",
            files={"file": ("test.wav", sample_audio_bytes, "audio/wav")},
        )

        assert response.status_code == 200
        assert response.headers["content-type"] == "audio/wav"
        assert "X-Speech-Duration" in response.headers
        assert "X-Total-Duration" in response.headers
        assert "X-Speech-Ratio" in response.headers
        assert "X-Processing-Time-Ms" in response.headers

        # Verify content is non-empty WAV
        assert len(response.content) > 0
        # WAV files start with "RIFF"
        assert response.content[:4] == b"RIFF"

    async def test_detect_endpoint_no_file(self, client: AsyncClient):
        """Test VAD detect endpoint without file returns error."""
        response = await client.post("/api/v1/vad/detect")

        assert response.status_code == 422  # Validation error

    async def test_detect_endpoint_invalid_threshold(
        self,
        client: AsyncClient,
        sample_audio_bytes: bytes,
    ):
        """Test VAD detect endpoint with invalid threshold."""
        response = await client.post(
            "/api/v1/vad/detect",
            params={"threshold": 1.5},  # Invalid: > 1.0
            files={"file": ("test.wav", sample_audio_bytes, "audio/wav")},
        )

        assert response.status_code == 422

    async def test_detect_segment_structure(
        self,
        client: AsyncClient,
        sample_audio_bytes: bytes,
    ):
        """Test that returned segments have correct structure."""
        response = await client.post(
            "/api/v1/vad/detect",
            files={"file": ("test.wav", sample_audio_bytes, "audio/wav")},
        )

        assert response.status_code == 200
        data = response.json()

        for segment in data["segments"]:
            assert "start" in segment
            assert "end" in segment
            assert isinstance(segment["start"], float)
            assert isinstance(segment["end"], float)
            assert segment["start"] >= 0
            assert segment["end"] >= segment["start"]


class TestOpenAPISchema:
    """Tests for OpenAPI schema availability."""

    async def test_openapi_schema_available(self, client: AsyncClient):
        """Test that OpenAPI schema is accessible."""
        response = await client.get("/openapi.json")

        assert response.status_code == 200
        data = response.json()
        assert "openapi" in data
        assert "info" in data
        assert data["info"]["title"] == "VAD Service"

    async def test_docs_available(self, client: AsyncClient):
        """Test that Swagger docs are accessible."""
        response = await client.get("/docs")

        assert response.status_code == 200

    async def test_redoc_available(self, client: AsyncClient):
        """Test that ReDoc docs are accessible."""
        response = await client.get("/redoc")

        assert response.status_code == 200
