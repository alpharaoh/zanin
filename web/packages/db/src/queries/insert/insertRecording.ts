import db from "../../";
import { InsertRecording, recording } from "../../schema";

export const insertRecording = async (values: InsertRecording) => {
  const entry = await db.insert(recording).values(values).returning();

  return entry[0];
};
