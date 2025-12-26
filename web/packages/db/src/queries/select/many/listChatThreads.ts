import { and, count, desc, isNull } from "drizzle-orm";
import { chatThreads, InsertChatThread } from "../../../schema";
import { buildWhere } from "../../../utils/buildWhere";
import db from "../../..";

export const listChatThreads = async (
  where?: Partial<InsertChatThread>,
  limit?: number,
  offset?: number,
) => {
  const baseWhere = buildWhere(chatThreads, where || {});
  const whereCondition = and(baseWhere, isNull(chatThreads.deletedAt));

  const dataQuery = db
    .select()
    .from(chatThreads)
    .where(whereCondition)
    .orderBy(desc(chatThreads.lastActivityAt));

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
