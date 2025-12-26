import { auth, fromNodeHeaders } from "@zanin/auth";
import type { Request } from "express";
import { BadRequestError, UnauthorizedError } from "../errors";
import type { AuthenticatedUser } from "../types/user";
import { getActiveOrganization } from "@zanin/db/utils/getActiveOrganization";

export async function expressAuthentication(
  request: Request,
  name: string,
  _scopes: string[],
): Promise<AuthenticatedUser> {
  if (name === "default") {
    // Check for API key in Authorization Bearer header first
    // Only attempt API key auth if the token looks like an API key (starts with zn_)
    const authHeader = request.headers["authorization"];
    if (
      authHeader &&
      typeof authHeader === "string" &&
      authHeader.startsWith("Bearer zn_")
    ) {
      const apiKeyValue = authHeader.slice(7);
      const result = await auth.api.verifyApiKey({
        body: { key: apiKeyValue },
      });

      if (!result.valid || !result.key) {
        return Promise.reject(new UnauthorizedError("Invalid API key"));
      }

      // Get user and their active organization
      const userId = result.key.userId;
      const organization = await getActiveOrganization(userId);

      // Build a mock user object for API key auth
      return {
        userId,
        organizationId: organization.id,
        session: {
          id: `api-key-${result.key.id}`,
          token: "",
          createdAt: new Date(),
          updatedAt: new Date(),
          expiresAt: result.key.expiresAt || new Date(Date.now() + 86400000),
          userId,
          activeOrganizationId: organization.id,
        },
        user: {
          id: userId,
          name: result.key.name || "API User",
          email: "",
          emailVerified: true,
          image: undefined,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };
    }

    // Fall back to session-based auth
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
