# @zanin/api

This service provides the backend REST API for the Zanin application. It's built with Express.js and uses [TSOA](https://tsoa-community.github.io/docs/) to generate routes and OpenAPI (Swagger) documentation automatically from TypeScript controllers.

## Features

-   **RESTful API:** Exposes endpoints for managing recordings, users, and other application data.
-   **Authentication:** Integrates with `@zanin/auth` for secure user authentication.
-   **Database Integration:** Uses `@zanin/db` for interacting with the PostgreSQL database via Drizzle ORM.
-   **Background Jobs:** Leverages [Inngest](https://www.inngest.com/) for asynchronous processing tasks (e.g., audio processing, vectorization).
-   **External Service Integrations:**
    -   [Deepgram](https://www.deepgram.com/) for speech-to-text transcription.
    -   [Pinecone](https://www.pinecone.io/) for vector search and similarity.
    -   [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) for object storage.
    -   Custom `sid` (Speaker Identification) and `vad` (Voice Activity Detection) services.
-   **API Documentation:** Automatically generated Swagger UI available at `/docs`.

## Installation

This package is part of the Zanin monorepo. It is not intended for standalone installation.

## Getting Started

To run the API service in development mode:

1.  **Ensure dependencies are installed:**
    ```bash
    bun install # from the root of the web/ directory
    ```
2.  **Run the API:**
    ```bash
    bun run dev:api # from the root of the web/ directory
    ```
    The API will be available at `http://localhost:8081` (or the port defined in your environment variables).

## API Documentation

Once the API is running, you can access the interactive Swagger UI at `http://localhost:8081/docs`.

## Building Routes and OpenAPI Specification

TSOA generates the Express routes and OpenAPI specification during the build process. This is typically handled by the monorepo's `build` script.

```bash
bun run build:api # from the root of the web/ directory
```
