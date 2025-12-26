import db from "../../";
import { eq, and, isNull } from "drizzle-orm";
import { chatThreads, InsertChatThread } from "../../schema";

export const updateChatThread = async (
  id: string,
  organizationId: string,
  values: Partial<InsertChatThread>,
) => {
  const entry = await db
    .update(chatThreads)
    .set(values)
    .where(
      and(
        eq(chatThreads.id, id),
        eq(chatThreads.organizationId, organizationId),
        isNull(chatThreads.deletedAt),
      ),
    )
    .returning();

  return entry[0];
};
