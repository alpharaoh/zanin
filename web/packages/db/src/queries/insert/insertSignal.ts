import db from "../../";
import { InsertSignal, signals } from "../../schema";

export const insertSignal = async (values: InsertSignal) => {
  const entry = await db.insert(signals).values(values).returning();

  return entry[0];
};
