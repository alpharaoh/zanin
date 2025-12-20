import db from "../../../";
import { eq, and } from "drizzle-orm";
import { recordings } from "../../../schema";

export const selectRecording = async (id: string, organizationId: string) => {
  const entry = await db
    .select()
    .from(recordings)
    .where(
      and(eq(recordings.id, id), eq(recordings.organizationId, organizationId)),
    )
    .limit(1);

  return entry[0];
};
