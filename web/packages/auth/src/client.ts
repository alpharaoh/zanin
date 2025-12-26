import { createAuthClient } from "better-auth/react";
import { organizationClient, apiKeyClient } from "better-auth/client/plugins";
import { env } from "@zanin/env/client";

export function createClient(baseURL: string) {
  return createAuthClient({
    baseURL,
    plugins: [organizationClient(), apiKeyClient()],
  });
}

export const authClient = createAuthClient({
  baseURL: env.PUBLIC_SERVER_BASE_URL,
  plugins: [organizationClient(), apiKeyClient()],
});
