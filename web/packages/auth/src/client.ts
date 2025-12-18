import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";
import { env } from "@zanin/env/client";

export function createClient(baseURL: string) {
  return createAuthClient({
    baseURL,
    plugins: [organizationClient()],
  });
}

export const authClient = createAuthClient({
  baseURL: env.SERVER_BASE_URL,
  plugins: [organizationClient()],
});
