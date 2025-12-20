# Zanin

A wearable device that captures audio throughout the day. Users plug it into their computer, audio gets processed, transcribed, and analyzed for key insights and areas of improvement.

## Tech Stack

- **Runtime**: Bun (package manager + runtime)
- **Monorepo**: Bun workspaces
- **Database**: PostgreSQL (Neon) with Drizzle ORM
- **Background Jobs**: Inngest
- **Vector Database**: Pinecone

## Project Structure

```
/web
├── client/                     # React frontend
├── packages/                   # Shared internal packages
│   ├── auth/                   # Authentication (better-auth)
│   ├── db/                     # Database (Drizzle ORM, schemas, queries)
│   └── env/                    # Environment validation (T3 Env + Zod)
├── services/
│   ├── api/                    # Express REST API and inngest workflows
│   └── vad/                    # Python FastAPI VAD service
└── package.json                # Root workspace config
```

## Services

### API (`/services/api`)
Express 5 + TSOA for OpenAPI generation. Handles auth, background jobs, and orchestration.

**Key directories:**
- `src/controllers/` - REST endpoints
- `src/handlers/` - Express middleware (auth, error, inngest)
- `src/inngest/` - Background job definitions
  - `functions/processAudio/` - Audio processing workflow (VAD, transcription, title generation, vectorization)
  - `functions/vectorize/` - Generic text vectorization with optional contextual embeddings
- `src/services/external/` - External service clients:
  - `deepgram/` - Speech-to-text transcription
  - `vad/` - VAD service client
  - `llm/` - LLM operations and utils
  - `store/blob/` - Blob storage
  - `store/vector/` - Vector storage

### VAD (`/services/vad`)
Python FastAPI service using Silero VAD. Detects voice activity and extracts speech-only audio.

**Endpoints:**
- `POST /api/v1/vad/detect` - Returns speech segment timestamps
- `POST /api/v1/vad/detect/audio` - Returns cleaned audio (speech only)

### Client (`/client`)
React 19 + Vite + TanStack Router/Query + Tailwind CSS.

## Roadmap

- [ ] Memory system (like OpenAI memory, without vector DB)
- [ ] Vector database semantic search integration
- [ ] Daily insight reports
- [ ] Hardware integration
- [ ] User file upload interface

## Running Locally

```bash
bun install
bun dev        # Runs all services concurrently
```

## Code Style

- Never write single-line statements (always use brackets + new lines)
- Use service pattern for external integrations (see `services/external/`)
