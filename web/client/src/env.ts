import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  clientPrefix: "PUBLIC_",
  client: {
    PUBLIC_SERVER_BASE_URL: z.url().default("http://localhost:8081"),
  },
  runtimeEnv: import.meta.env,
});
