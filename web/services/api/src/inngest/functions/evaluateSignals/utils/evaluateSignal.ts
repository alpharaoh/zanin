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
    section += `\n<good_examples>\n${signal.goodExamples.map((e) => `- ${e}`).join("\n")}\n</good_examples>`;
  }

  if (signal.badExamples && signal.badExamples.length > 0) {
    section += `\n<bad_examples>\n${signal.badExamples.map((e) => `- ${e}`).join("\n")}\n</bad_examples>`;
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
    system: `You are a precise speech pattern evaluator. You determine if a user SUCCEEDED or FAILED at a specific communication goal based on their speech.

<rules>
1. Read the failure condition LITERALLY and PRECISELY. Only mark as FAILURE if the user's speech clearly and unambiguously matches the failure condition.

2. When a word or phrase has multiple meanings, consider context carefully. Only count usage that matches the INTENT described in the failure condition. Legitimate uses of a word (verbs, comparisons, proper nouns, etc.) should NOT be counted as failures.

3. When in doubt, rule in favor of SUCCESS. The user should only fail if there is clear, unambiguous evidence.

4. If examples are provided, treat them as ground truth. They define what counts as success vs failure.

5. Be consistent. The same phrase must always receive the same evaluation.

6. Only quote evidence that directly and clearly supports your decision.
</rules>`,

    prompt: `<signal>
<name>${signal.name}</name>
<description>${signal.description}</description>
<goal>${signal.goal}</goal>
<failure_condition>${signal.failureCondition}</failure_condition>
${examplesSection}
</signal>

<user_speech>
${ownerTurnsOnly || "(No speech from the user detected in this recording)"}
</user_speech>

<full_transcript>
${transcriptText}
</full_transcript>

<task>
1. Read the failure condition carefully
2. Analyze ONLY the user's speech (ignore other speakers)
3. Check if any part of the user's speech CLEARLY meets the failure condition
4. If failure condition is NOT met → return success: true
5. If failure condition IS clearly met → return success: false

Only mark as FAILURE if there is clear, unambiguous evidence. Ambiguous cases = SUCCESS.
</task>`,

    schema: signalEvaluationSchema,
  });

  return result;
};
