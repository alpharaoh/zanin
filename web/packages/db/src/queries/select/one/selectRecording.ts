import db from "../../../";
import { eq } from "drizzle-orm";
import { recordings } from "../../../schema";

export const selectRecording = async (id: string) => {
  const entry = await db
    .select()
    .from(recordings)
    .where(eq(recordings.id, id))
    .limit(1);

  return entry[0];
};
