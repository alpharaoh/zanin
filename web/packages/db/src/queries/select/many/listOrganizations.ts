import { and, inArray } from "drizzle-orm";
import { InsertOrganization, organization } from "../../../schema";
import { buildWhere } from "../../../utils/buildWhere";
import db from "../../..";

export const listOrganizations = async (
  where?: Partial<InsertOrganization> & { ids?: string[] },
) => {
  const { ids, ...rest } = where || {};
  let whereCondition = buildWhere(organization, rest);

  if (ids) {
    whereCondition = and(whereCondition, inArray(organization.id, ids));
  }

  return await db.select().from(organization).where(whereCondition);
};
