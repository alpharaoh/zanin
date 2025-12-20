import { generateText } from "ai";
import { google } from "@ai-sdk/google";

/**
 * Generate contextual information for a chunk to improve search retrieval.
 * This implements Anthropic's Contextual Retrieval approach.
 *
 * @see https://www.anthropic.com/news/contextual-retrieval
 */
export async function generateContextForChunk(
  chunk: string,
  fullText: string,
): Promise<string> {
  const { text } = await generateText({
    model: google("gemini-2.0-flash"),
    prompt: `<document>
${fullText}
</document>

Here is the chunk we want to situate within the whole document:
<chunk>
${chunk}
</chunk>

Please give a short succinct context to situate this chunk within the overall document for the purposes of improving search retrieval of the chunk. Answer only with the succinct context and nothing else.`,
  });

  return text;
}
