# @zanin/env

This package provides a type-safe and validated way to manage environment variables for the Zanin project. It uses [`@t3-oss/env-core`](https://env.t3.gg/) and `zod` to ensure that all required environment variables are present and correctly formatted at runtime, preventing common configuration-related bugs.

## Features

-   **Type-safe Environment Variables:** Ensures that environment variables accessed in code have defined types.
-   **Runtime Validation:** Validates environment variables at application startup, failing early if any are missing or malformed.
-   **Separate Server and Client Environments:** Distinguishes between server-only and client-accessible environment variables.

## Installation

This package is part of the Zanin monorepo. It is not intended for standalone installation.

## Usage

### Server-side Environment Variables

For server-side code, import `env` from `@zanin/env/server`:

```typescript
import { env } from "@zanin/env/server";

// Access server-side environment variables
const databaseUrl = env.DATABASE_URL;
const deepgramApiKey = env.DEEPGRAM_API_KEY;
```

These variables are typically loaded from `.env` files in the root of the project or provided directly by the environment.

### Client-side Environment Variables

For client-side code (e.g., in the React frontend), import `env` from `@zanin/env/client`:

```typescript
import { env } from "@zanin/env/client";

// Access client-side environment variables
const publicServerBaseUrl = env.PUBLIC_SERVER_BASE_URL;
```

Client-side environment variables are typically prefixed with `PUBLIC_` and are exposed to the browser.

## Configuration

The schema for server and client environment variables is defined in `src/server.ts` and `src/client.ts` respectively. Ensure all required variables are set in your deployment environment or a `.env` file.
