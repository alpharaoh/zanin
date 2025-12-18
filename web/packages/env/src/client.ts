import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  clientPrefix: "",
  client: {
    SERVER_BASE_URL: z.url().default("http://localhost:8081"),
    BASE_URL: z.string(),
    DEV: z.boolean(),
    MODE: z.enum(["development", "production"]),
    PROD: z.boolean(),
  },
  runtimeEnv: (import.meta as any).env,
  emptyStringAsUndefined: true,
});
