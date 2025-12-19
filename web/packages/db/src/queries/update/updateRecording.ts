import db from "../../";
import { InsertRecording, recordings } from "../../schema";
import { buildWhere } from "../../utils/buildWhere";

export const updateRecording = async (
  where: Partial<InsertRecording>,
  values: Partial<InsertRecording>,
) => {
  const conditionals = buildWhere(recordings, where);

  return await db
    .update(recordings)
    .set(values)
    .where(conditionals)
    .returning();
};
