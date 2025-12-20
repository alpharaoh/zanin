## Zanin.ai

To know.

A wearable device that captures audio throughout the day. Users plug it into their computer, audio gets processed, transcribed, and analyzed for key insights and areas of improvement.

## Project Structure

```
/zanin
├── web/          # Web application (API, frontend, database)
├── firmware/     # Hardware firmware (ESP32-S3)
└── README.md
```

## Components

### Web (`/web`)
Full-stack web application for processing and analyzing recordings.
- **API**: Express + TSOA REST API with background jobs (Inngest)
- **Client**: React 19 + Vite frontend
- **Database**: PostgreSQL (Neon) with Drizzle ORM
- **Vector DB**: Pinecone for semantic search

### Firmware (`/firmware`)
ESP32-S3 based wearable audio recorder.
- Records audio via I2S microphone
- Stores to microSD card
- USB-C mass storage for file transfer
- Button, LED, battery powered

## Getting Started

### Web Development
```bash
cd web
bun install
bun dev
```

### Firmware Development
```bash
cd firmware
# Install PlatformIO CLI or use VS Code extension
pio run           # Build
pio run -t upload # Flash to device
```

## Hardware Requirements

See [firmware/README.md](./firmware/README.md) for full hardware documentation.

**Quick BOM:**
- ESP32-S3 DevKitC-1
- INMP441 I2S Microphone
- MicroSD Card Module
- LiPo Battery + TP4056 Charger
- Button, LED
