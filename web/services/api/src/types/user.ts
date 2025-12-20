export type UserSession = {
  session: {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    expiresAt: Date;
    token: string;
    activeOrganizationId?: string | undefined;
  };
  user: {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    email: string;
    emailVerified: boolean;
    name: string;
    image?: string | undefined;
  };
} | null;

/**
 * Authenticated user with guaranteed organizationId.
 * This is what's available on request.user after @Security("default") passes.
 */
export type AuthenticatedUser = {
  userId: string;
  organizationId: string;
  session: NonNullable<UserSession>["session"] & {
    activeOrganizationId: string;
  };
  user: NonNullable<UserSession>["user"];
};
