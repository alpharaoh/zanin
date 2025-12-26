import { and, count, inArray, isNull } from "drizzle-orm";
import { chatThreads, InsertChatThread } from "../../../schema";
import { buildOrderBy } from "../../../utils/buildOrderBy";
import { buildWhere } from "../../../utils/buildWhere";
import db from "../../..";

export const listChatThreads = async (
  where?: Partial<InsertChatThread> & { ids?: string[] },
  orderBy?: Partial<Record<keyof InsertChatThread, "asc" | "desc">>,
  limit?: number,
  offset?: number,
) => {
  const { ids, ...rest } = where || {};
  let whereCondition = and(
    buildWhere(chatThreads, rest),
    isNull(chatThreads.deletedAt),
  );

  if (ids) {
    whereCondition = and(whereCondition, inArray(chatThreads.id, ids));
  }

  const dataQuery = db.select().from(chatThreads).where(whereCondition);

  if (orderBy) {
    dataQuery.orderBy(...buildOrderBy(chatThreads, orderBy));
  }

  if (limit) {
    dataQuery.limit(limit);
  }

  if (offset) {
    dataQuery.offset(offset);
  }

  const countQuery = db
    .select({ count: count() })
    .from(chatThreads)
    .where(whereCondition);

  const [data, countResult] = await Promise.all([dataQuery, countQuery]);

  return {
    data,
    count: countResult[0]?.count ?? 0,
  };
};
