import { jsonb, pgTable, real, text, timestamp } from "drizzle-orm/pg-core";
import { getDefaultColumns } from "../utils/getDefaultColumns";
import { getDefaultOwnershipColumns } from "../utils/getDefaultOwnershipColumns";

export const recordings = pgTable("recordings", {
  ...getDefaultColumns(),
  ...getDefaultOwnershipColumns(),
  status: text("status").notNull().default("pending"),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  processingError: text("processing_error"),
  title: text("title"),
  rawAudioUrl: text("raw_audio_url").notNull(),
  cleanedAudioUrl: text("cleaned_audio_url"),
  confidence: real("confidence"),
  originalDuration: real("original_duration"),
  cleanedTranscript: text("cleaned_transcript"),
  words: jsonb("words"),
  vadSegments: jsonb("vad_segments"),
  metadata: jsonb("metadata"),
});

export type SelectRecording = typeof recordings.$inferSelect;
export type InsertRecording = typeof recordings.$inferInsert;
