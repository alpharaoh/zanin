import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";
import "dotenv/config";
import { env } from "@/env";

export const authClient = createAuthClient({
  baseURL: env.PUBLIC_SERVER_BASE_URL,
  plugins: [organizationClient()],
});
