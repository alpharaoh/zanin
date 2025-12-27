import { insertSignal } from "@zanin/db/queries/insert/insertSignal";
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
    description: "Achieve 3 successful evaluations in a row",
    icon: "🔥",
    category: "streaks",
  },
  streak_7: {
    id: "streak_7",
    name: "Lucky Seven",
    description: "Achieve 7 successful evaluations in a row",
    icon: "🔥",
    category: "streaks",
  },
  streak_14: {
    id: "streak_14",
    name: "Double Down",
    description: "Achieve 14 successful evaluations in a row",
    icon: "🌟",
    category: "streaks",
  },
  streak_30: {
    id: "streak_30",
    name: "Unstoppable",
    description: "Achieve 30 successful evaluations in a row",
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

export interface SignalStats {
  totalPoints: number;
  currentStreak: number;
  longestStreak: number;
  totalSuccesses: number;
  totalFailures: number;
  lastEvaluatedAt: Date | null;
}

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

/**
 * Compute stats from evaluations for a signal
 */
function computeStatsFromEvaluations(
  evaluations: SelectSignalEvaluation[],
): SignalStats {
  if (evaluations.length === 0) {
    return {
      totalPoints: 0,
      currentStreak: 0,
      longestStreak: 0,
      totalSuccesses: 0,
      totalFailures: 0,
      lastEvaluatedAt: null,
    };
  }

  // Sort by createdAt ascending for streak calculation
  const sorted = [...evaluations].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  let totalPoints = 0;
  let totalSuccesses = 0;
  let totalFailures = 0;
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  for (const evaluation of sorted) {
    totalPoints += evaluation.pointsAwarded;

    if (evaluation.success) {
      totalSuccesses++;
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      totalFailures++;
      tempStreak = 0;
    }
  }

  // Current streak is the streak at the end
  currentStreak = tempStreak;

  // Last evaluated is the most recent
  const lastEvaluatedAt = sorted[sorted.length - 1].createdAt;

  return {
    totalPoints,
    currentStreak,
    longestStreak,
    totalSuccesses,
    totalFailures,
    lastEvaluatedAt,
  };
}

function toSignalResponse(signal: SelectSignal, stats: SignalStats): Signal {
  return {
    id: signal.id,
    name: signal.name,
    description: signal.description,
    goal: signal.goal,
    failureCondition: signal.failureCondition,
    goodExamples: signal.goodExamples,
    badExamples: signal.badExamples,
    isActive: signal.isActive,
    totalPoints: stats.totalPoints,
    currentStreak: stats.currentStreak,
    longestStreak: stats.longestStreak,
    totalSuccesses: stats.totalSuccesses,
    totalFailures: stats.totalFailures,
    lastEvaluatedAt: stats.lastEvaluatedAt,
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

/**
 * Helper to get stats for a single signal
 */
async function getSignalStats(signalId: string): Promise<SignalStats> {
  const { data: evaluations } = await listSignalEvaluations(
    { signalId },
    { createdAt: "asc" },
  );
  return computeStatsFromEvaluations(evaluations);
}

/**
 * Helper to get stats for multiple signals in a batch
 */
async function getSignalsStats(
  signalIds: string[],
): Promise<Map<string, SignalStats>> {
  const statsMap = new Map<string, SignalStats>();

  // Fetch all evaluations for all signals
  const promises = signalIds.map(async (signalId) => {
    const stats = await getSignalStats(signalId);
    statsMap.set(signalId, stats);
  });

  await Promise.all(promises);
  return statsMap;
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

    // New signal has no evaluations, so empty stats
    const emptyStats: SignalStats = {
      totalPoints: 0,
      currentStreak: 0,
      longestStreak: 0,
      totalSuccesses: 0,
      totalFailures: 0,
      lastEvaluatedAt: null,
    };

    return toSignalResponse(signal, emptyStats);
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

    const stats = await getSignalStats(id);
    return toSignalResponse(signal, stats);
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

    // Batch fetch stats for all signals
    const signalIds = data.map((s) => s.id);
    const statsMap = await getSignalsStats(signalIds);

    return {
      signals: data.map((signal) => {
        const stats = statsMap.get(signal.id) || {
          totalPoints: 0,
          currentStreak: 0,
          longestStreak: 0,
          totalSuccesses: 0,
          totalFailures: 0,
          lastEvaluatedAt: null,
        };
        return toSignalResponse(signal, stats);
      }),
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

    const stats = await getSignalStats(id);
    return toSignalResponse(updated[0], stats);
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

    const stats = await getSignalStats(id);
    return toSignalResponse(deleted[0], stats);
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

    // Compute stats for all signals
    const signalIds = signals.map((s) => s.id);
    const statsMap = await getSignalsStats(signalIds);

    const activeSignals = signals.filter((s) => s.isActive);

    let totalPoints = 0;
    let bestCurrentStreak = 0;
    let longestEverStreak = 0;
    let totalSuccesses = 0;
    let totalFailures = 0;

    for (const signal of signals) {
      const stats = statsMap.get(signal.id);
      if (stats) {
        totalPoints += stats.totalPoints;
        bestCurrentStreak = Math.max(bestCurrentStreak, stats.currentStreak);
        longestEverStreak = Math.max(longestEverStreak, stats.longestStreak);
        totalSuccesses += stats.totalSuccesses;
        totalFailures += stats.totalFailures;
      }
    }

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
