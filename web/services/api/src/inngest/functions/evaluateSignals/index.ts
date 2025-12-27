import { inngest } from "../../client";
import { selectRecording } from "@zanin/db/queries/select/one/selectRecording";
import { listSignals } from "@zanin/db/queries/select/many/listSignals";
import { listSignalEvaluations } from "@zanin/db/queries/select/many/listSignalEvaluations";
import { insertSignalEvaluation } from "@zanin/db/queries/insert/insertSignalEvaluation";
import { transcriptToText } from "../processAudio/utils/buildStructuredTranscript";
import {
  checkAndAwardAchievements,
  EvaluationResult,
} from "./utils/achievements";
import { evaluateSignal } from "./utils/evaluateSignal";

export interface EvaluateSignalsData {
  recordingId: string;
  organizationId: string;
  userId: string;
}

type EvaluateSignals = {
  data: EvaluateSignalsData;
};

export type EvaluateSignalsEvent = {
  "signals/evaluate": EvaluateSignals;
};

interface TranscriptTurn {
  speaker: string;
  speakerNumber: number;
  content: string;
  start: number;
  end: number;
  wordCount: number;
}

export default inngest.createFunction(
  {
    id: "evaluate-signals",
    concurrency: 5,
  },
  { event: "signals/evaluate" },
  async ({ event, step, logger }) => {
    const { recordingId, organizationId, userId } = event.data;

    logger.info("Evaluating signals for recording", {
      recordingId,
      organizationId,
      userId,
    });

    // Get the recording
    const recording = await step.run("get-recording", async () => {
      return await selectRecording(recordingId, organizationId);
    });

    if (!recording || !recording.transcript) {
      logger.info("Recording not ready for signal evaluation", { recordingId });
      return { success: false, reason: "recording_not_ready" };
    }

    // Get active signals for this user
    const { data: activeSignals } = await step.run(
      "get-active-signals",
      async () => {
        return await listSignals(
          { userId, organizationId, isActive: true },
          { createdAt: "asc" },
        );
      },
    );

    if (activeSignals.length === 0) {
      logger.info("No active signals to evaluate", { recordingId, userId });
      return { success: true, evaluated: 0 };
    }

    // Build transcript text
    const transcript = recording.transcript as TranscriptTurn[];
    const transcriptText = transcriptToText(transcript);
    const ownerTurns = transcript
      .filter((turn) => turn.speaker === "ME")
      .map((turn) => turn.content)
      .join("\n\n");

    // Evaluate each signal
    const results: EvaluationResult[] = [];

    for (const signal of activeSignals) {
      const evaluation = await step.run(
        `evaluate-signal-${signal.id}`,
        async () => {
          // Get existing evaluations to compute current stats
          const { data: existingEvaluations } = await listSignalEvaluations(
            { signalId: signal.id },
            { createdAt: "asc" },
          );

          // Compute current stats from existing evaluations
          let previousTotalPoints = 0;
          let currentStreak = 0;

          for (const e of existingEvaluations) {
            previousTotalPoints += e.pointsAwarded;
            if (e.success) {
              currentStreak++;
            } else {
              currentStreak = 0;
            }
          }

          // Evaluate the signal
          const result = await evaluateSignal(
            {
              name: signal.name,
              description: signal.description,
              goal: signal.goal,
              failureCondition: signal.failureCondition,
              goodExamples: signal.goodExamples,
              badExamples: signal.badExamples,
            },
            transcriptText,
            ownerTurns,
          );

          // Calculate new stats
          const pointsAwarded = result.success ? 1 : -1;
          const newStreak = result.success ? currentStreak + 1 : 0;
          const newTotalPoints = previousTotalPoints + pointsAwarded;

          // Insert evaluation
          await insertSignalEvaluation({
            signalId: signal.id,
            recordingId,
            success: result.success,
            pointsAwarded,
            reasoning: result.reasoning,
            evidence: result.evidence,
            confidence: result.confidence,
            streakAtEvaluation: currentStreak,
          });

          return {
            signalId: signal.id,
            signalName: signal.name,
            success: result.success,
            newStreak,
            newTotalPoints,
            previousTotalPoints,
          };
        },
      );

      results.push(evaluation);
    }

    // Check for achievements
    const newAchievements = await step.run("check-achievements", async () => {
      return await checkAndAwardAchievements(userId, organizationId, results);
    });

    logger.info("Evaluated signals for recording", {
      recordingId,
      signalsEvaluated: results.length,
      successes: results.filter((r) => r.success).length,
      newAchievements: newAchievements.length,
    });

    return {
      success: true,
      evaluated: results.length,
      results,
      newAchievements: newAchievements.map((a) => a.achievementType),
    };
  },
);
