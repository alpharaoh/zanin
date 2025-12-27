import db from "../../";
import { InsertSignal, signals } from "../../schema";
import { buildWhere } from "../../utils/buildWhere";

export const updateSignal = async (
  where: Partial<InsertSignal>,
  values: Partial<InsertSignal>,
) => {
  const conditionals = buildWhere(signals, where);

  return await db
    .update(signals)
    .set(values)
    .where(conditionals)
    .returning();
};
