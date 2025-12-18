import db from "../";
import { eq } from "drizzle-orm";
import { member, organization } from "../schema";

export async function getActiveOrganization(userId: string) {
  const orgRow = await db
    .select({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
    })
    .from(member)
    .innerJoin(organization, eq(member.organizationId, organization.id))
    .where(eq(member.userId, userId))
    .orderBy(member.createdAt)
    .limit(1)
    .then((rows) => rows[0]);

  if (!orgRow) {
    throw new Error("You are not a member of any organization");
  }

  return orgRow;
}
