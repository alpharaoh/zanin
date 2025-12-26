import { isNull } from "drizzle-orm";
import { chatThreads, InsertChatThread } from "../../../schema";
import { buildListQuery } from "../../../utils/buildListQuery";

export const listChatThreads = async (
  where?: Partial<InsertChatThread> & { ids?: string[] },
  orderBy?: Partial<Record<keyof InsertChatThread, "asc" | "desc">>,
  limit?: number,
  offset?: number,
) => {
  return buildListQuery(chatThreads, {
    where,
    orderBy,
    limit,
    offset,
    extraConditions: [isNull(chatThreads.deletedAt)],
  });
};
