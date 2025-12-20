import { Controller, Get, Request, Response, Route, Security } from "tsoa";
import type { Request as ExpressRequest } from "express";
import { listMembers } from "@zanin/db/queries/select/many/listMembers";
import { listOrganizations } from "@zanin/db/queries/select/many/listOrganizations";
import { UnauthorizedError } from "../errors";

interface User {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  email: string;
  emailVerified: boolean;
  name: string;
  image?: string | undefined;
  activeOrganizationId?: string | undefined;
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
@Response(500, "Internal Server Error")
@Route("users")
export class UsersController extends Controller {
  /**
   * Retrieves the details of the user calling the API.
   */
  @Get("me")
  public async getMe(@Request() request: ExpressRequest): Promise<User> {
    if (!request.user) {
      throw new UnauthorizedError();
    }

    const members = await listMembers({
      userId: request.user.user.id,
    });
    const organizationIdsForUser = members.map((m) => m.organizationId);
    const organizations = await listOrganizations({
      ids: organizationIdsForUser,
    });

    const user: User = {
      id: request.user?.user.id,
      createdAt: request.user?.user.createdAt,
      updatedAt: request.user?.user.updatedAt,
      email: request.user?.user.email,
      emailVerified: request.user?.user.emailVerified,
      name: request.user?.user.name,
      image: request.user?.user.image,
      activeOrganizationId: request.user?.session.activeOrganizationId,
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

    return user;
  }
}
