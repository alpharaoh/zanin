# @zanin/auth

This package provides authentication utilities for the Zanin project, designed for both server-side and client-side usage. It leverages `better-auth` for core authentication logic and integrates with `@zanin/db` for database interactions.

## Features

-   **Server-side authentication:** Middleware and helper functions for handling authentication in Node.js environments.
-   **Client-side authentication:** Utilities for managing user sessions and authentication states in the frontend.

## Installation

This package is part of the Zanin monorepo. It is not intended for standalone installation.

## Usage

### Server-side (e.g., in `@zanin/api`)

```typescript
import { authMiddleware, auth } from "@zanin/auth";

// Use authMiddleware in your Express/TSOA application
app.use(authMiddleware);

// Access authentication state
const currentUser = auth();
```

### Client-side (e.g., in `@zanin/client`)

```typescript
import { clientAuth } from "@zanin/auth/client";

// Use clientAuth for frontend authentication operations
clientAuth.signIn('username', 'password');
```
