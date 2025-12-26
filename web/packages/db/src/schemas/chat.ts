import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { getDefaultColumns } from "../utils/getDefaultColumns";
import { getDefaultOwnershipColumns } from "../utils/getDefaultOwnershipColumns";
import { recordings } from "./recordings";

export const chatThreads = pgTable("chat_threads", {
  ...getDefaultColumns(),
  ...getDefaultOwnershipColumns(),
  // Scope: null means "all recordings", otherwise specific recording ID
  recordingId: text("recording_id").references(() => recordings.id, {
    onDelete: "cascade",
  }),
  // External reference ID (e.g., LangGraph thread ID)
  referenceId: text("reference_id"),
  // Thread title (optional, can be auto-generated from first message)
  title: text("title"),
  // Last activity timestamp for sorting
  lastActivityAt: timestamp("last_activity_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const chatMessages = pgTable("chat_messages", {
  ...getDefaultColumns(),
  threadId: text("thread_id")
    .notNull()
    .references(() => chatThreads.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // "user" | "assistant"
  content: text("content").notNull(),
  // Optional metadata (sources, tool calls, etc.)
  metadata: jsonb("metadata"),
});

export type SelectChatThread = typeof chatThreads.$inferSelect;
export type InsertChatThread = typeof chatThreads.$inferInsert;

export type SelectChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;
