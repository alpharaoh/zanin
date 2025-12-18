import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";
import { env } from "@zanin/env";

export function createClient(baseURL: string) {
  return createAuthClient({
    baseURL,
    plugins: [organizationClient()],
  });
}

// Default client for convenience
export const authClient = createAuthClient({
  baseURL: env.PUBLIC_SERVER_BASE_URL,
  plugins: [organizationClient()],
});
