import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const getRuntime = (): Record<string, string | undefined> => {
  // Vite/browser environment
  const meta = import.meta;
  if (typeof meta !== "undefined" && "env" in meta) {
    return meta.env as Record<string, string | undefined>;
  }
  // Node/Bun environment
  return process.env as Record<string, string | undefined>;
};

export const env = createEnv({
  server: {
    DATABASE_URL: z.url(),
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(1),
    BETTER_AUTH_URL: z.url(),
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    PORT: z.coerce.number().default(8081),
    CLIENT_URL: z.url().default("http://localhost:8080"),
  },
  clientPrefix: "PUBLIC_",
  client: {
    PUBLIC_SERVER_BASE_URL: z.url().default("http://localhost:8081"),
  },
  runtimeEnv: getRuntime(),
  emptyStringAsUndefined: true,
  skipValidation:
    typeof window !== "undefined" || typeof import.meta !== "undefined",
});
