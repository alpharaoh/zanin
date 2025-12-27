import db from "../../";
import { InsertSignalEvaluation, signalEvaluations } from "../../schema";

export const insertSignalEvaluation = async (
  values: InsertSignalEvaluation,
) => {
  const entry = await db.insert(signalEvaluations).values(values).returning();

  return entry[0];
};
