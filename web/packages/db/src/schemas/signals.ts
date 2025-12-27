import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { getDefaultColumns } from "../utils/getDefaultColumns";
import { getDefaultOwnershipColumns } from "../utils/getDefaultOwnershipColumns";
import { recordings } from "./recordings";

// Main signals table - user-defined behaviors to track
export const signals = pgTable("signals", {
  ...getDefaultColumns(),
  ...getDefaultOwnershipColumns(),

  // Signal definition
  name: text("name").notNull(),
  description: text("description").notNull(),
  goal: text("goal").notNull(),
  failureCondition: text("failure_condition").notNull(),

  // Optional examples for better LLM understanding
  goodExamples: jsonb("good_examples").$type<string[]>(),
  badExamples: jsonb("bad_examples").$type<string[]>(),

  // State
  isActive: boolean("is_active").notNull().default(true),

  // Gamification stats (denormalized for quick access)
  totalPoints: integer("total_points").notNull().default(0),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  totalSuccesses: integer("total_successes").notNull().default(0),
  totalFailures: integer("total_failures").notNull().default(0),
  lastEvaluatedAt: timestamp("last_evaluated_at", { withTimezone: true }),
});

// Signal evaluations - results for each recording
export const signalEvaluations = pgTable("signal_evaluations", {
  ...getDefaultColumns(),

  signalId: text("signal_id")
    .notNull()
    .references(() => signals.id, { onDelete: "cascade" }),
  recordingId: text("recording_id")
    .notNull()
    .references(() => recordings.id, { onDelete: "cascade" }),

  // Evaluation result
  success: boolean("success").notNull(),
  pointsAwarded: integer("points_awarded").notNull(),

  // LLM reasoning
  reasoning: text("reasoning").notNull(),
  evidence: jsonb("evidence").$type<string[]>(),
  confidence: text("confidence").notNull(), // "high" | "medium" | "low"

  // Streak at time of evaluation
  streakAtEvaluation: integer("streak_at_evaluation").notNull().default(0),
});

// User achievements
export const achievements = pgTable("achievements", {
  ...getDefaultColumns(),
  ...getDefaultOwnershipColumns(),

  achievementType: text("achievement_type").notNull(), // e.g., "first_signal", "streak_7", "points_100"
  signalId: text("signal_id").references(() => signals.id, {
    onDelete: "set null",
  }), // null for global achievements
  unlockedAt: timestamp("unlocked_at", { withTimezone: true })
    .notNull()
    .defaultNow(),

  // Achievement metadata
  metadata: jsonb("metadata").$type<{
    signalName?: string;
    streakCount?: number;
    pointsTotal?: number;
    recordingId?: string;
  }>(),
});

export type SelectSignal = typeof signals.$inferSelect;
export type InsertSignal = typeof signals.$inferInsert;

export type SelectSignalEvaluation = typeof signalEvaluations.$inferSelect;
export type InsertSignalEvaluation = typeof signalEvaluations.$inferInsert;

export type SelectAchievement = typeof achievements.$inferSelect;
export type InsertAchievement = typeof achievements.$inferInsert;
