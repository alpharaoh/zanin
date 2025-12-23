import { SimpleLLMService } from "../../../../services/external/llm/simple";

export const generateRecordingSummary = async (transcriptText: string) => {
  return await SimpleLLMService.generateText(
    `You are analyzing a conversation transcript. Write a concise summary (2-4 sentences) that captures:
- The main topic or purpose of the conversation
- Key decisions, outcomes, or action items if any
- The overall tone/nature of the interaction

Transcript:
${transcriptText}

Summary:`,
  );
};
