import db from "../../";
import { InsertRecording, recording } from "../../schema";
import { buildWhere } from "../../utils/buildWhere";

export const updateRecording = async (
  where: Partial<InsertRecording>,
  values: Partial<InsertRecording>,
) => {
  const conditionals = buildWhere(recording, where);

  return await db
    .update(recording)
    .set(values)
    .where(conditionals)
    .returning();
};
