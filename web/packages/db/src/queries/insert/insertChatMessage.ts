import db from "../../";
import { InsertChatMessage, chatMessages } from "../../schema";

export const insertChatMessage = async (values: InsertChatMessage) => {
  const entry = await db.insert(chatMessages).values(values).returning();
  return entry[0];
};
