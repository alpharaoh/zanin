import { auth, fromNodeHeaders } from "@zanin/db/auth";
import type { Request } from "express";

export async function expressAuthentication(
  request: Request,
  name: string,
  _scopes: string[],
): Promise<unknown> {
  if (name === "default") {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    });

    if (!session) {
      return Promise.reject(new Error("Unauthorized"));
    }

    return session;
  }

  return Promise.reject(new Error("Unknown security scheme"));
}
