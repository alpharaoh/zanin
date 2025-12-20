# SID Service

Speaker Identification service using SpeechBrain ECAPA-TDNN. Enroll voice profiles and identify speakers in audio recordings.

## Features

- **Speaker Enrollment**: Create voice profiles from audio samples
- **Speaker Identification**: Identify if audio matches an enrolled speaker
- **Post-processing**: Designed for use after transcription/diarization
- **Cosine Similarity**: Uses embedding comparison for verification

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/sid/enroll` | POST | Enroll a speaker's voice profile |
| `/api/v1/sid/identify` | POST | Identify speakers in audio segments |
| `/api/v1/sid/profiles/{user_id}` | GET | Get profile info |
| `/api/v1/sid/profiles/{user_id}` | DELETE | Delete a profile |
| `/health` | GET | Health check |
| `/health/ready` | GET | Readiness check |
| `/docs` | GET | Swagger UI documentation |

## Quick Start

```bash
# Install dependencies
poetry install

# Run the service
poetry run sid-service

# Or with uvicorn directly
poetry run uvicorn sid_service.main:app --host 0.0.0.0 --port 8001
```

## Usage Example

```bash
# Enroll a speaker (provide 10-30 seconds of speech)
curl -X POST "http://localhost:8001/api/v1/sid/enroll" \
  -F "user_id=user123" \
  -F "audio=@enrollment_audio.wav" \
  | jq

# Identify speakers in segments
curl -X POST "http://localhost:8001/api/v1/sid/identify" \
  -F "user_id=user123" \
  -F 'segments=[{"speaker": 0, "start": 0.0, "end": 5.2}, {"speaker": 1, "start": 5.2, "end": 12.8}]' \
  -F "audio=@recording.wav" \
  | jq

# Check if profile exists
curl "http://localhost:8001/api/v1/sid/profiles/user123" | jq

# Delete profile
curl -X DELETE "http://localhost:8001/api/v1/sid/profiles/user123"
```

## Configuration

Environment variables (prefix with `SID_`):

| Variable | Default | Description |
|----------|---------|-------------|
| `SID_HOST` | 0.0.0.0 | Server host |
| `SID_PORT` | 8001 | Server port |
| `SID_WORKERS` | 4 | Number of workers |
| `SID_SIMILARITY_THRESHOLD` | 0.25 | Cosine similarity threshold for "owner" |
| `SID_PROFILES_DIR` | /data/profiles | Directory for voice profiles |
| `SID_LOG_LEVEL` | INFO | Log level |
| `SID_LOG_FORMAT` | json | Log format (json/console) |

## Docker

```bash
# Build
docker build -t sid-service .

# Run (mount volume for persistent profiles)
docker run -p 8001:8001 -v ./profiles:/data/profiles sid-service
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

## How It Works

1. **Enrollment**: Extract a 192-dim speaker embedding from audio using ECAPA-TDNN
2. **Storage**: Save embedding as the user's voice profile (`.npy` file)
3. **Identification**: Extract embeddings from audio segments, compare via cosine similarity
4. **Threshold**: If similarity >= 0.25, label as "owner", else "other"

## Rainbow Passage (For enrollment)

When the sunlight strikes raindrops in the air, they act as a prism and form a rainbow. The rainbow is a division of white light into many beautiful colors. These take the shape of a long round arch, with its path high above, and its two ends apparently beyond the horizon. There is, according to legend, a boiling pot of gold at one end. People look, but no one ever finds it. When a man looks for something beyond his reach, his friends say he is looking for the pot of gold at the end of the rainbow.

## Model

Uses [SpeechBrain ECAPA-TDNN](https://huggingface.co/speechbrain/spkrec-ecapa-voxceleb) trained on VoxCeleb1+2:
- 192-dimensional speaker embeddings
- Text-independent (works with any speech content)
- Language-agnostic
