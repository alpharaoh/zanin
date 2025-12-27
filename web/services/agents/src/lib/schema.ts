import { jsonb, pgTable, real, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const recordings = pgTable("recordings", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  organizationId: uuid("organization_id").notNull(),
  userId: uuid("user_id").notNull(),
  status: text("status").notNull().default("pending"),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  processingError: text("processing_error"),
  title: text("title"),
  rawAudioUrl: text("raw_audio_url").notNull(),
  cleanedAudioUrl: text("cleaned_audio_url"),
  confidence: real("confidence"),
  originalDuration: real("original_duration"),
  transcript: jsonb("transcript"),
  words: jsonb("words"),
  vadSegments: jsonb("vad_segments"),
  speakerLabels: jsonb("speaker_labels"),
  metadata: jsonb("metadata"),
  summary: text("summary"),
  ownerAnalysis: jsonb("owner_analysis"),
});

export type SelectRecording = typeof recordings.$inferSelect;
