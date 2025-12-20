# @zanin/db

This package provides the database schema, queries, and migration utilities for the Zanin project. It uses [Drizzle ORM](https://orm.drizzle.team/) with PostgreSQL, connecting via `@neondatabase/serverless` or `pg`.

## Features

-   **Database Schema Definition:** Defines the structure of the database tables.
-   **Type-safe Queries:** Provides type-safe functions for interacting with the database.
-   **Database Migrations:** Manages schema changes over time.

## Installation

This package is part of the Zanin monorepo. It is not intended for standalone installation.

## Usage

### Database Instance

The main database instance can be imported and used as follows:

```typescript
import db from "@zanin/db";

// Use the db instance for your queries
const users = await db.query.users.findMany();
```

### Schema

The database schema is defined in `src/schema.ts` and can be imported:

```typescript
import * as schema from "@zanin/db/schema";
```

### Queries and Utilities

Individual queries and utility functions can be imported from their respective paths:

```typescript
import { insertRecording } from "@zanin/db/queries/insert/insertRecording";
import { buildWhere } from "@zanin/db/utils/buildWhere";
```

## Database Migrations

Database migration commands are defined in the root `web/package.json` for convenience. These commands utilize `drizzle-kit`.

-   **Generate a new migration based on schema changes:**
    ```bash
    bun run db:generate
    ```
    This will create a new migration file in the `drizzle/` directory.

-   **Apply pending migrations to the database:**
    ```bash
    bun run db:migrate
    ```
    Ensure your `DATABASE_URL` environment variable is correctly set.
