import { isNull } from "drizzle-orm";
import { chatMessages, InsertChatMessage } from "../../../schema";
import { buildListQuery } from "../../../utils/buildListQuery";

export const listChatMessages = async (
  where?: Partial<InsertChatMessage> & { ids?: string[] },
  orderBy?: Partial<Record<keyof InsertChatMessage, "asc" | "desc">>,
  limit?: number,
  offset?: number,
) => {
  return buildListQuery(chatMessages, {
    where,
    orderBy,
    limit,
    offset,
    extraConditions: [isNull(chatMessages.deletedAt)],
  });
};
