import { z } from "zod";
import { SimpleLLMService } from "../../../../services/external/llm/simple";
import { IdentifyResponse } from "../../../../services/external/sid/service";
import { transcriptToText, TranscriptTurn } from "./buildStructuredTranscript";

const ownerAnalysisSchema = z.object({
  communicationStyle: z
    .string()
    .describe(
      "Brief description of how they communicated (e.g., 'direct and concise', 'collaborative and questioning')",
    ),
  strengths: z.array(z.string()).describe("List of communication strengths"),
  improvements: z.array(z.string()).describe("List of areas for improvement"),
  conversationRole: z
    .string()
    .describe(
      "Their role in the conversation (e.g., 'facilitator', 'listener', 'presenter', 'collaborator')",
    ),
  keyBehaviors: z.array(z.string()).describe("Notable behaviors observed"),
});

export const generateOwnerAnalysis = async (
  speakerIdentification: IdentifyResponse,
  transcript: TranscriptTurn[],
) => {
  if (!speakerIdentification) {
    return undefined;
  }

  const ownerTurns = transcript.filter(
    (turn: { speaker: string }) => turn.speaker === "ME",
  );

  if (ownerTurns.length === 0) {
    return undefined;
  }

  const totalDuration =
    speakerIdentification.owner_speaking_seconds +
    speakerIdentification.other_speaking_seconds;
  const ownerPercentage =
    totalDuration > 0
      ? Math.round(
          (speakerIdentification.owner_speaking_seconds / totalDuration) * 100,
        )
      : 0;

  try {
    const analysis = await SimpleLLMService.generateObject({
      system:
        "You are a communication coach analyzing how someone participated in a conversation. Keep responses short and concise but informative.",
      prompt: `Analyze how the owner participated in this conversation.

Context:
- Owner spoke for ${speakerIdentification.owner_speaking_seconds.toFixed(1)}s (${ownerPercentage}% of conversation)
- Others spoke for ${speakerIdentification.other_speaking_seconds.toFixed(1)}s
- Owner had ${ownerTurns.length} speaking turns

Full transcript (owner is marked with "ME"):
${transcriptToText(transcript)}`,
      schema: ownerAnalysisSchema,
    });

    return {
      ...analysis,
      speakingPercentage: ownerPercentage,
      turnCount: ownerTurns.length,
    };
  } catch {
    return {
      communicationStyle: "Analysis unavailable",
      strengths: [],
      improvements: [],
      conversationRole: "participant",
      keyBehaviors: [],
      speakingPercentage: ownerPercentage,
      turnCount: ownerTurns.length,
    };
  }
};
