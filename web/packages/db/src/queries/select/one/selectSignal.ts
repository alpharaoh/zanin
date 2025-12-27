import db from "../../../";
import { eq, and, isNull } from "drizzle-orm";
import { signals } from "../../../schema";

export const selectSignal = async (
  id: string,
  userId: string,
  organizationId: string,
) => {
  const entry = await db
    .select()
    .from(signals)
    .where(
      and(
        eq(signals.id, id),
        eq(signals.userId, userId),
        eq(signals.organizationId, organizationId),
        isNull(signals.deletedAt),
      ),
    )
    .limit(1);

  return entry[0];
};
