import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const getRuntime = (): Record<string, string | undefined> => {
  const viteEnv = (import.meta as any).env;
  if (viteEnv && typeof viteEnv.MODE === "string") {
    console.log(viteEnv);
    return viteEnv;
  }

  // Node/Bun environment
  return process.env;
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
  clientPrefix: "",
  client: {
    SERVER_BASE_URL: z.url().default("http://localhost:8081"),
    BASE_URL: z.string(),
    DEV: z.boolean(),
    MODE: z.enum(["development", "production"]),
    PROD: z.boolean(),
  },
  runtimeEnv: getRuntime(),
  emptyStringAsUndefined: true,
  skipValidation:
    typeof window !== "undefined" || typeof import.meta !== "undefined",
});
