import { and, count, inArray } from "drizzle-orm";
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

  const dataQuery = db.select().from(organization).where(whereCondition);

  if (orderBy) {
    dataQuery.orderBy(...buildOrderBy(organization, orderBy));
  }

  if (limit) {
    dataQuery.limit(limit);
  }

  if (offset) {
    dataQuery.offset(offset);
  }

  const countQuery = db
    .select({ count: count() })
    .from(organization)
    .where(whereCondition);

  const [data, countResult] = await Promise.all([dataQuery, countQuery]);

  return {
    data,
    count: countResult[0]?.count ?? 0,
  };
};
