import db from "../../../";
import { eq, and, isNull } from "drizzle-orm";
import { chatThreads } from "../../../schema";

export const selectChatThread = async (id: string, organizationId: string) => {
  const entry = await db
    .select()
    .from(chatThreads)
    .where(
      and(
        eq(chatThreads.id, id),
        eq(chatThreads.organizationId, organizationId),
        isNull(chatThreads.deletedAt),
      ),
    )
    .limit(1);

  return entry[0];
};
