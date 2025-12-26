import { and, asc, count, eq, isNull } from "drizzle-orm";
import { chatMessages } from "../../../schema";
import db from "../../..";

export const listChatMessages = async (
  threadId: string,
  limit?: number,
  offset?: number,
) => {
  const whereCondition = and(
    eq(chatMessages.threadId, threadId),
    isNull(chatMessages.deletedAt),
  );

  const dataQuery = db
    .select()
    .from(chatMessages)
    .where(whereCondition)
    .orderBy(asc(chatMessages.createdAt));

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
