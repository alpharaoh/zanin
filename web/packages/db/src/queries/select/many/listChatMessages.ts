import { and, count, inArray, isNull } from "drizzle-orm";
import { chatMessages, InsertChatMessage } from "../../../schema";
import { buildOrderBy } from "../../../utils/buildOrderBy";
import { buildWhere } from "../../../utils/buildWhere";
import db from "../../..";

export const listChatMessages = async (
  where?: Partial<InsertChatMessage> & { ids?: string[] },
  orderBy?: Partial<Record<keyof InsertChatMessage, "asc" | "desc">>,
  limit?: number,
  offset?: number,
) => {
  const { ids, ...rest } = where || {};
  let whereCondition = and(
    buildWhere(chatMessages, rest),
    isNull(chatMessages.deletedAt),
  );

  if (ids) {
    whereCondition = and(whereCondition, inArray(chatMessages.id, ids));
  }

  const dataQuery = db.select().from(chatMessages).where(whereCondition);

  if (orderBy) {
    dataQuery.orderBy(...buildOrderBy(chatMessages, orderBy));
  }

  if (limit) {
    dataQuery.limit(limit);
  }

  if (offset) {
    dataQuery.offset(offset);
  }

  const countQuery = db
    .select({ count: count() })
    .from(chatMessages)
    .where(whereCondition);

  const [data, countResult] = await Promise.all([dataQuery, countQuery]);

  return {
    data,
    count: countResult[0]?.count ?? 0,
  };
};
