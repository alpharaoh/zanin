import { auth, fromNodeHeaders } from "@zanin/auth";
import type { Request } from "express";
import { BadRequestError, UnauthorizedError } from "../errors";
import type { AuthenticatedUser } from "../types/user";

export async function expressAuthentication(
  request: Request,
  name: string,
  _scopes: string[],
): Promise<AuthenticatedUser> {
  if (name === "default") {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    });

    if (!session) {
      return Promise.reject(new UnauthorizedError());
    }

    const organizationId = session.session.activeOrganizationId;
    if (!organizationId) {
      return Promise.reject(new BadRequestError("No active organization"));
    }

    return {
      userId: session.user.id,
      organizationId,
      session: {
        ...session.session,
        activeOrganizationId: organizationId,
      },
      user: session.user as AuthenticatedUser["user"],
    };
  }

  return Promise.reject(new Error("Unknown security scheme"));
}
