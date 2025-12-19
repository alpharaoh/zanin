import db from "../../";
import { InsertRecording, recordings } from "../../schema";

export const insertRecording = async (values: InsertRecording) => {
  const entry = await db.insert(recordings).values(values).returning();

  return entry[0];
};
