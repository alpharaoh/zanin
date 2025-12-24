import { generateText, generateObject } from "ai";
import { google } from "@ai-sdk/google";
import type { z } from "zod";

export const SimpleLLMService = {
  /**
   * Generate plain text from a prompt
   */
  async generateText(prompt: string): Promise<string> {
    const { text } = await generateText({
      model: google("gemini-2.5-flash"),
      prompt,
    });
    return text;
  },

  /**
   * Generate a structured object from a prompt with a Zod schema.
   * Returns typed output that matches the schema.
   *
   * @example
   * const result = await SimpleLLMService.generateObject({
   *   prompt: "Analyze this text...",
   *   schema: z.object({
   *     sentiment: z.string(),
   *     score: z.number(),
   *   }),
   * });
   * // result is typed as { sentiment: string; score: number }
   */
  async generateObject<T extends z.ZodType>({
    prompt,
    schema,
    system,
  }: {
    prompt: string;
    schema: T;
    system?: string;
  }): Promise<z.infer<T>> {
    const { object } = await generateObject({
      model: google("gemini-2.5-flash"),
      prompt,
      schema,
      system,
    });
    return object as z.infer<T>;
  },
};
