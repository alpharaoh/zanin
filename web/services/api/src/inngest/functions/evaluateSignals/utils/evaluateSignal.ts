import { z } from "zod";
import { SimpleLLMService } from "../../../../services/external/llm/simple";

const signalEvaluationSchema = z.object({
  success: z
    .boolean()
    .describe(
      "Whether the user succeeded (true) or failed (false) at this signal",
    ),
  reasoning: z
    .string()
    .describe("2-3 sentence explanation of why this determination was made"),
  evidence: z
    .array(z.string())
    .describe("1-3 direct quotes from the transcript supporting the decision"),
  confidence: z
    .enum(["high", "medium", "low"])
    .describe("Confidence level in this evaluation"),
});

export interface SignalDefinition {
  name: string;
  description: string;
  goal: string;
  failureCondition: string;
  goodExamples?: string[] | null;
  badExamples?: string[] | null;
}

export interface EvaluationResult {
  success: boolean;
  reasoning: string;
  evidence: string[];
  confidence: "high" | "medium" | "low";
}

function buildExamplesSection(signal: SignalDefinition): string {
  let section = "";

  if (signal.goodExamples && signal.goodExamples.length > 0) {
    section += `\n**Good Examples (SUCCESS):**\n${signal.goodExamples.map((e) => `- ${e}`).join("\n")}`;
  }

  if (signal.badExamples && signal.badExamples.length > 0) {
    section += `\n**Bad Examples (FAILURE):**\n${signal.badExamples.map((e) => `- ${e}`).join("\n")}`;
  }

  return section;
}

export const evaluateSignal = async (
  signal: SignalDefinition,
  transcriptText: string,
  ownerTurnsOnly: string,
): Promise<EvaluationResult> => {
  const examplesSection = buildExamplesSection(signal);

  const result = await SimpleLLMService.generateObject({
    system: `You are a speech coach evaluating whether someone achieved their communication goal in a conversation.

You will be given:
1. A signal definition (what the user wants to track)
2. The user's own speech from the conversation (marked as "ME")
3. The full transcript for context

Your job is to determine if the user SUCCEEDED or FAILED based on the failure condition.
Be fair but encouraging. Give credit when deserved, but be honest about failures.
If the transcript is too short or doesn't contain relevant content, evaluate based on what is available.`,

    prompt: `## Signal to Evaluate

**Name:** ${signal.name}
**Description:** ${signal.description}
**Goal:** ${signal.goal}
**Failure Condition:** ${signal.failureCondition}
${examplesSection}

## User's Speech (evaluate this)

${ownerTurnsOnly || "(No speech from the user detected in this recording)"}

## Full Transcript (for context)

${transcriptText}

---

Evaluate whether the user SUCCEEDED or FAILED at this signal based on the failure condition.`,

    schema: signalEvaluationSchema,
  });

  return result;
};
