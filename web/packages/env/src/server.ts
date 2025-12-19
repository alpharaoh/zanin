import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.url(),
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(1),
    BETTER_AUTH_URL: z.url(),
    DEEPGRAM_API_KEY: z.string().min(1),
    VAD_SERVICE_URL: z.url().default("http://localhost:8000"),
    BLOB_READ_WRITE_TOKEN: z.string().min(1),
    GOOGLE_GENERATIVE_AI_API_KEY: z.string().min(1),
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    PORT: z.coerce.number().default(8081),
    CLIENT_URL: z.url().default("http://localhost:8080"),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
