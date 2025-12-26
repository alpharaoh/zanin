import { and, count, desc, eq, isNull } from "drizzle-orm";
import { chatThreads } from "../../../schema";
import db from "../../..";

export const listChatThreads = async (
  organizationId: string,
  userId: string,
  limit?: number,
  offset?: number,
) => {
  const whereCondition = and(
    eq(chatThreads.organizationId, organizationId),
    eq(chatThreads.userId, userId),
    isNull(chatThreads.deletedAt),
  );

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
