import { SimpleLLMService } from "../../../../services/external/llm/simple";
import { IdentifyResponse } from "../../../../services/external/sid/service";
import { TranscriptTurn } from "./buildStructuredTranscript";

export const generateOwnerAnalysis = async (
  speakerIdentification: IdentifyResponse,
  transcript: TranscriptTurn[],
) => {
  if (!speakerIdentification) {
    return undefined;
  }

  // Build owner-only transcript for analysis
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

  const ownerTranscript = ownerTurns
    .map((turn: { content: string }) => turn.content)
    .join("\n\n");

  const analysisPrompt = `You are a communication coach analyzing how someone (the "owner") participated in a conversation.

Context:
- Owner spoke for ${speakerIdentification.owner_speaking_seconds.toFixed(1)}s (${ownerPercentage}% of conversation)
- Others spoke for ${speakerIdentification.other_speaking_seconds.toFixed(1)}s
- Owner had ${ownerTurns.length} speaking turns

Owner's statements:
${ownerTranscript}

Provide a JSON analysis with these fields:
{
  "communicationStyle": "brief description of how they communicated (e.g., 'direct and concise', 'collaborative and questioning')",
  "strengths": ["strength 1", "strength 2"],
  "improvements": ["area for improvement 1", "area for improvement 2"],
  "conversationRole": "their role in the conversation (e.g., 'facilitator', 'listener', 'presenter', 'collaborator')",
  "keyBehaviors": ["notable behavior 1", "notable behavior 2"]
}

Keep the response short, concise but informative.

Only respond with valid JSON, no other text.`;

  const analysisText = await SimpleLLMService.generateText(analysisPrompt);

  try {
    const parsed = JSON.parse(analysisText.trim());
    return {
      communicationStyle: parsed.communicationStyle || "",
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      improvements: Array.isArray(parsed.improvements)
        ? parsed.improvements
        : [],
      conversationRole: parsed.conversationRole || "",
      keyBehaviors: Array.isArray(parsed.keyBehaviors)
        ? parsed.keyBehaviors
        : [],
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
