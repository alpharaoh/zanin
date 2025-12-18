import { auth, fromNodeHeaders } from "@zanin/db/auth";
import type { Request } from "express";

export async function expressAuthentication(
  request: Request,
  name: string,
  _scopes: string[],
) {
  if (name === "default") {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    });
    return session;
  }
}
