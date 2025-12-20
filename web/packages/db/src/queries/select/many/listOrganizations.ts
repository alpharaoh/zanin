import { and, inArray } from "drizzle-orm";
import { InsertOrganization, organization } from "../../../schema";
import { buildOrderBy } from "../../../utils/buildOrderBy";
import { buildWhere } from "../../../utils/buildWhere";
import db from "../../..";

export const listOrganizations = async (
  where?: Partial<InsertOrganization> & { ids?: string[] },
  orderBy?: Partial<Record<keyof InsertOrganization, "asc" | "desc">>,
  limit?: number,
  offset?: number,
) => {
  const { ids, ...rest } = where || {};
  let whereCondition = buildWhere(organization, rest);

  if (ids) {
    whereCondition = and(whereCondition, inArray(organization.id, ids));
  }

  const query = db.select().from(organization).where(whereCondition);

  if (orderBy) {
    query.orderBy(...buildOrderBy(organization, orderBy));
  }

  if (limit) {
    query.limit(limit);
  }

  if (offset) {
    query.offset(offset);
  }

  return query;
};
