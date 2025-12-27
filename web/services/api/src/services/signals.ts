import { insertSignal } from "@zanin/db/queries/insert/insertSignal";
import { insertAchievement } from "@zanin/db/queries/insert/insertAchievement";
import { selectSignal } from "@zanin/db/queries/select/one/selectSignal";
import { listSignals } from "@zanin/db/queries/select/many/listSignals";
import { listSignalEvaluations } from "@zanin/db/queries/select/many/listSignalEvaluations";
import { listAchievements } from "@zanin/db/queries/select/many/listAchievements";
import { updateSignal } from "@zanin/db/queries/update/updateSignal";
import {
  SelectSignal,
  SelectSignalEvaluation,
  SelectAchievement,
} from "@zanin/db/schema";

// Achievement definitions
export const ACHIEVEMENT_DEFINITIONS = {
  // Getting Started
  first_signal: {
    id: "first_signal",
    name: "Signal Pioneer",
    description: "Create your first signal",
    icon: "⚡",
    category: "getting_started",
  },
  first_success: {
    id: "first_success",
    name: "First Win",
    description: "Get your first successful evaluation",
    icon: "✅",
    category: "getting_started",
  },

  // Streak Achievements
  streak_3: {
    id: "streak_3",
    name: "On a Roll",
    description: "Achieve a 3-day streak on any signal",
    icon: "🔥",
    category: "streaks",
  },
  streak_7: {
    id: "streak_7",
    name: "Week Warrior",
    description: "Achieve a 7-day streak on any signal",
    icon: "🔥",
    category: "streaks",
  },
  streak_14: {
    id: "streak_14",
    name: "Fortnight Fighter",
    description: "Achieve a 14-day streak on any signal",
    icon: "🌟",
    category: "streaks",
  },
  streak_30: {
    id: "streak_30",
    name: "Monthly Master",
    description: "Achieve a 30-day streak on any signal",
    icon: "👑",
    category: "streaks",
  },

  // Points Achievements
  points_10: {
    id: "points_10",
    name: "Double Digits",
    description: "Earn 10 total points on any signal",
    icon: "⭐",
    category: "points",
  },
  points_50: {
    id: "points_50",
    name: "Half Century",
    description: "Earn 50 total points on any signal",
    icon: "🥇",
    category: "points",
  },
  points_100: {
    id: "points_100",
    name: "Centurion",
    description: "Earn 100 total points on any signal",
    icon: "🏆",
    category: "points",
  },

  // Recovery
  comeback: {
    id: "comeback",
    name: "Comeback Kid",
    description: "Recover from a negative points balance to positive",
    icon: "💪",
    category: "recovery",
  },
} as const;

export type AchievementType = keyof typeof ACHIEVEMENT_DEFINITIONS;

export interface Signal {
  id: string;
  name: string;
  description: string;
  goal: string;
  failureCondition: string;
  goodExamples: string[] | null;
  badExamples: string[] | null;
  isActive: boolean;
  totalPoints: number;
  currentStreak: number;
  longestStreak: number;
  totalSuccesses: number;
  totalFailures: number;
  lastEvaluatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date | null;
}

export interface SignalEvaluation {
  id: string;
  signalId: string;
  recordingId: string;
  success: boolean;
  pointsAwarded: number;
  reasoning: string;
  evidence: string[] | null;
  confidence: string;
  streakAtEvaluation: number;
  createdAt: Date;
}

export interface Achievement {
  id: string;
  achievementType: string;
  signalId: string | null;
  unlockedAt: Date;
  metadata: {
    signalName?: string;
    streakCount?: number;
    pointsTotal?: number;
    recordingId?: string;
  } | null;
  createdAt: Date;
}

export interface CreateSignalInput {
  organizationId: string;
  userId: string;
  name: string;
  description: string;
  goal: string;
  failureCondition: string;
  goodExamples?: string[];
  badExamples?: string[];
}

export interface UpdateSignalInput {
  name?: string;
  description?: string;
  goal?: string;
  failureCondition?: string;
  goodExamples?: string[];
  badExamples?: string[];
  isActive?: boolean;
}

export interface ListSignalsInput {
  organizationId: string;
  userId: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

export interface SignalsStats {
  totalPoints: number;
  activeSignals: number;
  bestCurrentStreak: number;
  longestEverStreak: number;
  achievementsUnlocked: number;
  totalAchievements: number;
  totalEvaluations: number;
  overallSuccessRate: number;
}

function toSignalResponse(signal: SelectSignal): Signal {
  return {
    id: signal.id,
    name: signal.name,
    description: signal.description,
    goal: signal.goal,
    failureCondition: signal.failureCondition,
    goodExamples: signal.goodExamples,
    badExamples: signal.badExamples,
    isActive: signal.isActive,
    totalPoints: signal.totalPoints,
    currentStreak: signal.currentStreak,
    longestStreak: signal.longestStreak,
    totalSuccesses: signal.totalSuccesses,
    totalFailures: signal.totalFailures,
    lastEvaluatedAt: signal.lastEvaluatedAt,
    createdAt: signal.createdAt,
    updatedAt: signal.updatedAt,
  };
}

function toEvaluationResponse(
  evaluation: SelectSignalEvaluation,
): SignalEvaluation {
  return {
    id: evaluation.id,
    signalId: evaluation.signalId,
    recordingId: evaluation.recordingId,
    success: evaluation.success,
    pointsAwarded: evaluation.pointsAwarded,
    reasoning: evaluation.reasoning,
    evidence: evaluation.evidence,
    confidence: evaluation.confidence,
    streakAtEvaluation: evaluation.streakAtEvaluation,
    createdAt: evaluation.createdAt,
  };
}

function toAchievementResponse(achievement: SelectAchievement): Achievement {
  return {
    id: achievement.id,
    achievementType: achievement.achievementType,
    signalId: achievement.signalId,
    unlockedAt: achievement.unlockedAt,
    metadata: achievement.metadata,
    createdAt: achievement.createdAt,
  };
}

export const SignalsService = {
  /**
   * Create a new signal
   */
  create: async (input: CreateSignalInput): Promise<Signal> => {
    const signal = await insertSignal({
      organizationId: input.organizationId,
      userId: input.userId,
      name: input.name,
      description: input.description,
      goal: input.goal,
      failureCondition: input.failureCondition,
      goodExamples: input.goodExamples,
      badExamples: input.badExamples,
    });

    // Check for first_signal achievement
    const { data: existingSignals } = await listSignals(
      { userId: input.userId, organizationId: input.organizationId },
      undefined,
      2,
    );

    if (existingSignals.length === 1) {
      await insertAchievement({
        organizationId: input.organizationId,
        userId: input.userId,
        achievementType: "first_signal",
        metadata: { signalName: input.name },
      });
    }

    return toSignalResponse(signal);
  },

  /**
   * Get a signal by ID
   */
  getById: async (
    id: string,
    userId: string,
    organizationId: string,
  ): Promise<Signal | undefined> => {
    const signal = await selectSignal(id, userId, organizationId);

    if (!signal) {
      return undefined;
    }

    return toSignalResponse(signal);
  },

  /**
   * List signals for a user
   */
  list: async (
    input: ListSignalsInput,
  ): Promise<{ signals: Signal[]; count: number }> => {
    const { organizationId, userId, isActive, limit = 50, offset = 0 } = input;

    const { data, count } = await listSignals(
      {
        organizationId,
        userId,
        isActive,
      },
      { createdAt: "desc" },
      limit,
      offset,
    );

    return {
      signals: data.map(toSignalResponse),
      count,
    };
  },

  /**
   * Update a signal
   */
  update: async (
    id: string,
    userId: string,
    organizationId: string,
    input: UpdateSignalInput,
  ): Promise<Signal | undefined> => {
    const existing = await selectSignal(id, userId, organizationId);

    if (!existing) {
      return undefined;
    }

    const updated = await updateSignal({ id, userId, organizationId }, input);

    if (!updated?.[0]) {
      return undefined;
    }

    return toSignalResponse(updated[0]);
  },

  /**
   * Soft delete a signal
   */
  delete: async (
    id: string,
    userId: string,
    organizationId: string,
  ): Promise<Signal | undefined> => {
    const existing = await selectSignal(id, userId, organizationId);

    if (!existing) {
      return undefined;
    }

    const deleted = await updateSignal(
      { id, userId, organizationId },
      { deletedAt: new Date() },
    );

    if (!deleted?.[0]) {
      return undefined;
    }

    return toSignalResponse(deleted[0]);
  },

  /**
   * List evaluations for a signal
   */
  listEvaluations: async (
    signalId: string,
    userId: string,
    organizationId: string,
    limit = 50,
    offset = 0,
  ): Promise<{ evaluations: SignalEvaluation[]; count: number }> => {
    // Verify signal ownership
    const signal = await selectSignal(signalId, userId, organizationId);

    if (!signal) {
      return { evaluations: [], count: 0 };
    }

    const { data, count } = await listSignalEvaluations(
      { signalId },
      { createdAt: "desc" },
      limit,
      offset,
    );

    return {
      evaluations: data.map(toEvaluationResponse),
      count,
    };
  },

  /**
   * List achievements for a user
   */
  listAchievements: async (
    userId: string,
    organizationId: string,
  ): Promise<{
    achievements: Achievement[];
    definitions: typeof ACHIEVEMENT_DEFINITIONS;
  }> => {
    const { data } = await listAchievements(
      { userId, organizationId },
      { unlockedAt: "desc" },
    );

    return {
      achievements: data.map(toAchievementResponse),
      definitions: ACHIEVEMENT_DEFINITIONS,
    };
  },

  /**
   * Get dashboard stats for a user
   */
  getStats: async (
    userId: string,
    organizationId: string,
  ): Promise<SignalsStats> => {
    const { data: signals } = await listSignals(
      { userId, organizationId },
      undefined,
    );

    const { data: achievements } = await listAchievements({
      userId,
      organizationId,
    });

    const activeSignals = signals.filter((s) => s.isActive);
    const totalPoints = signals.reduce((sum, s) => sum + s.totalPoints, 0);
    const bestCurrentStreak = Math.max(
      0,
      ...signals.map((s) => s.currentStreak),
    );
    const longestEverStreak = Math.max(
      0,
      ...signals.map((s) => s.longestStreak),
    );
    const totalSuccesses = signals.reduce(
      (sum, s) => sum + s.totalSuccesses,
      0,
    );
    const totalFailures = signals.reduce((sum, s) => sum + s.totalFailures, 0);
    const totalEvaluations = totalSuccesses + totalFailures;
    const overallSuccessRate =
      totalEvaluations > 0
        ? Math.round((totalSuccesses / totalEvaluations) * 100)
        : 0;

    return {
      totalPoints,
      activeSignals: activeSignals.length,
      bestCurrentStreak,
      longestEverStreak,
      achievementsUnlocked: achievements.length,
      totalAchievements: Object.keys(ACHIEVEMENT_DEFINITIONS).length,
      totalEvaluations,
      overallSuccessRate,
    };
  },
};
