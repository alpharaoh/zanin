import { and, inArray } from "drizzle-orm";
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

  const query = db.select().from(member).where(whereCondition);

  if (orderBy) {
    query.orderBy(...buildOrderBy(member, orderBy));
  }

  if (limit) {
    query.limit(limit);
  }

  if (offset) {
    query.offset(offset);
  }

  return query;
};
