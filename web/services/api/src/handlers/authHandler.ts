import { auth, fromNodeHeaders } from "@zanin/auth";
import type { Request } from "express";
import { UnauthorizedError } from "../errors";

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
      return Promise.reject(new UnauthorizedError());
    }

    return session;
  }

  return Promise.reject(new Error("Unknown security scheme"));
}
