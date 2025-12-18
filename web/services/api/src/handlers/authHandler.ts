import { auth, fromNodeHeaders } from "@zanin/db/auth";
import type { Request } from "express";

export async function expressAuthentication(
  request: Request,
  name: string,
  _scopes: string[],
) {
  console.log("HERE\n\n\n", request.headers, name, _scopes);
  if (name === "default") {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    });
    return session;
  }
}
