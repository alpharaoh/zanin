import { and, count, inArray } from "drizzle-orm";
import { InsertMember, member } from "../../../schema";
import { buildOrderBy } from "../../../utils/buildOrderBy";
import { buildWhere } from "../../../utils/buildWhere";
import db from "../../..";

export const listMembers = async (
  where?: Partial<InsertMember> & { ids?: string[] },
  orderBy?: Partial<Record<keyof InsertMember, "asc" | "desc">>,
  limit?: number,
  offset?: number,
) => {
  const { ids, ...rest } = where || {};
  let whereCondition = buildWhere(member, rest);

  if (ids) {
    whereCondition = and(whereCondition, inArray(member.id, ids));
  }

  const dataQuery = db.select().from(member).where(whereCondition);

  if (orderBy) {
    dataQuery.orderBy(...buildOrderBy(member, orderBy));
  }

  if (limit) {
    dataQuery.limit(limit);
  }

  if (offset) {
    dataQuery.offset(offset);
  }

  const countQuery = db
    .select({ count: count() })
    .from(member)
    .where(whereCondition);

  const [data, countResult] = await Promise.all([dataQuery, countQuery]);

  return {
    data,
    count: countResult[0]?.count ?? 0,
  };
};
