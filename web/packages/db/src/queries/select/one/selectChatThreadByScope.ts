import db from "../../../";
import { eq, and, isNull } from "drizzle-orm";
import { chatThreads } from "../../../schema";

/**
 * Find a thread by scope (organizationId + userId + optional recordingId)
 * recordingId = undefined means "all recordings" scope
 */
export const selectChatThreadByScope = async (
  organizationId: string,
  userId: string,
  recordingId?: string,
) => {
  const conditions = [
    eq(chatThreads.organizationId, organizationId),
    eq(chatThreads.userId, userId),
    isNull(chatThreads.deletedAt),
  ];

  if (recordingId) {
    conditions.push(eq(chatThreads.recordingId, recordingId));
  } else {
    conditions.push(isNull(chatThreads.recordingId));
  }

  const entry = await db
    .select()
    .from(chatThreads)
    .where(and(...conditions))
    .limit(1);

  return entry[0];
};
