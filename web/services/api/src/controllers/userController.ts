import { Controller, Get, Request, Response, Route, Security } from "tsoa";
import type { Request as ExpressRequest } from "express";
import { listMembers } from "@zanin/db/queries/select/many/listMembers";
import { listOrganizations } from "@zanin/db/queries/select/many/listOrganizations";

interface User {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  email: string;
  emailVerified: boolean;
  name: string;
  image?: string | undefined;
  activeOrganizationId: string;
  organizations: {
    name: string;
    slug: string | null;
    logo: string | null;
    metadata: unknown;
    id: string;
    createdAt: Date;
    updatedAt: Date | null;
  }[];
}

@Security("default")
@Response(401, "Unauthorized")
@Response(400, "No active organization")
@Response(500, "Internal Server Error")
@Route("v1/users")
export class UsersController extends Controller {
  /**
   * Retrieves the details of the user calling the API.
   */
  @Get("me")
  public async getMe(@Request() request: ExpressRequest): Promise<User> {
    const { userId, organizationId, user } = request.user!;

    const { data: members } = await listMembers({ userId });
    const organizationIdsForUser = members.map((m) => m.organizationId);
    const { data: organizations } = await listOrganizations({
      ids: organizationIdsForUser,
    });

    return {
      id: user.id,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      email: user.email,
      emailVerified: user.emailVerified,
      name: user.name,
      image: user.image,
      activeOrganizationId: organizationId,
      organizations: organizations.map((org) => ({
        name: org.name,
        slug: org.slug,
        logo: org.logo,
        metadata: org.metadata,
        id: org.id,
        createdAt: org.createdAt,
        updatedAt: org.updatedAt,
      })),
    };
  }
}
