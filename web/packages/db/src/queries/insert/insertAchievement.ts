import db from "../../";
import { InsertAchievement, achievements } from "../../schema";

export const insertAchievement = async (values: InsertAchievement) => {
  const entry = await db.insert(achievements).values(values).returning();

  return entry[0];
};
