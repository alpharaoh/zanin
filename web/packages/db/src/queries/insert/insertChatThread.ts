import db from "../../";
import { InsertChatThread, chatThreads } from "../../schema";

export const insertChatThread = async (values: InsertChatThread) => {
  const entry = await db.insert(chatThreads).values(values).returning();
  return entry[0];
};
