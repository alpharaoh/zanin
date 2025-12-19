import { generateText } from "ai";
import { google } from "@ai-sdk/google";

export const SimpleLLMService = {
  async generateText(prompt: string) {
    const { text } = await generateText({
      model: google("gemini-2.5-flash"),
      prompt,
    });
    return text;
  },
};
