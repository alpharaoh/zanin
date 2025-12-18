# VAD Service

Voice Activity Detection service using silero-vad. Detect speech segments in audio files and extract only the speech portions.

## Features

- **Speech Detection**: Detect voice activity in audio files using silero-vad
- **Audio Output**: Extract only speech segments from audio files
- **Streaming**: Server-Sent Events for real-time segment detection
- **Large File Support**: Process files up to 2GB via streaming

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/vad/detect` | POST | Detect speech, return JSON timestamps |
| `/api/v1/vad/detect/audio` | POST | Detect speech, return processed WAV |
| `/api/v1/vad/detect/stream` | POST | Stream detection via SSE |
| `/health` | GET | Health check |
| `/health/ready` | GET | Readiness check |
| `/docs` | GET | Swagger UI documentation |

## Quick Start

```bash
# Install dependencies
poetry install

# Run the service
poetry run vad-service

# Or with uvicorn directly
poetry run uvicorn vad_service.main:app --host 0.0.0.0 --port 8000
```

## Usage Example

```bash
# Detect speech in an audio file
curl -X POST "http://localhost:8000/api/v1/vad/detect" \
  -F "file=@audio.wav" \
  | jq

# Get only speech audio
curl -X POST "http://localhost:8000/api/v1/vad/detect/audio" \
  -F "file=@audio.wav" \
  -o speech_only.wav
```

## Configuration

Environment variables (prefix with `VAD_`):

| Variable | Default | Description |
|----------|---------|-------------|
| `VAD_HOST` | 0.0.0.0 | Server host |
| `VAD_PORT` | 8000 | Server port |
| `VAD_WORKERS` | 4 | Number of workers |
| `VAD_VAD_THRESHOLD` | 0.5 | Speech detection threshold |
| `VAD_LOG_LEVEL` | INFO | Log level |
| `VAD_LOG_FORMAT` | json | Log format (json/console) |

## Docker

```bash
# Build
docker build -t vad-service .

# Run
docker run -p 8000:8000 vad-service
```

## Development

```bash
# Install with dev dependencies
poetry install

# Run tests
poetry run pytest

# Lint
poetry run ruff check .
```
