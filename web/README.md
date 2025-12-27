# Zanin

A wearable device that captures audio throughout the day. Users plug it into their computer, audio gets processed, transcribed, and analyzed for key insights and areas of improvement.

## Tech Stack

- **Runtime**: Bun (package manager + runtime)
- **Monorepo**: Bun workspaces
- **Database**: PostgreSQL with Drizzle ORM
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
│   ├── agents/                 # LangGraph agents for recordings
│   ├── vad/                    # Python FastAPI VAD service
│   └── sid/                    # Python FastAPI Speaker ID service
└── docker-compose.yml          # Local development stack
```

## Running Locally

### Option 1: Native (Bun)

```bash
bun install
bun dev        # Runs all services concurrently
```

### Option 2: Docker Compose

Spin up all services with a local PostgreSQL database:

```bash
# Build and start all services
docker compose up --build

# Start in detached mode
docker compose up -d --build

# View logs
docker compose logs -f

# Stop all services
docker compose down

# Stop and remove volumes (fresh start)
docker compose down -v
```

#### Services & Ports

| Service   | Port  | Description                    |
|-----------|-------|--------------------------------|
| postgres  | 54399 | PostgreSQL database            |
| api       | 8081  | Express REST API               |
| agents    | 3001  | LangGraph agents               |
| vad       | 8000  | Voice Activity Detection       |
| sid       | 8082  | Speaker Identification         |

#### Running Specific Services

```bash
# Just the database
docker compose up postgres

# Database + API only
docker compose up postgres api

# Rebuild a specific service
docker compose build api
docker compose up api
```

#### Connecting to Local Database

When using Docker Compose, connect to PostgreSQL at:

```
postgresql://zanin:zanin@localhost:54399/zanin
```

#### Running Migrations

After starting the database, run migrations:

```bash
DATABASE_URL="postgresql://zanin:zanin@localhost:54399/zanin" bun run db:migrate
```

## Services

### API (`/services/api`)

Express 5 + TSOA for OpenAPI generation. Handles auth, background jobs, and orchestration.

### Agents (`/services/agents`)

LangGraph-based agents for querying and analyzing recordings.

### VAD (`/services/vad`)

Python FastAPI service using Silero VAD. Detects voice activity and extracts speech-only audio.

### SID (`/services/sid`)

Python FastAPI service using SpeechBrain for speaker identification and diarization.

### Client (`/client`)

React 19 + Vite + TanStack Router/Query + Tailwind CSS.

```bash
# Run client separately (when using Docker for backend)
bun dev:client
```
