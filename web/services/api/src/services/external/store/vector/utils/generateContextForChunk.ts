import { GoogleGenAI } from "@google/genai";
import { env } from "@zanin/env/server";

const DEFAULT_CACHE_TTL = 300; // 5 minutes

const client = new GoogleGenAI({ apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY });

/**
 * Create a cached context for the full document.
 * Use this when processing many chunks from the same document to save tokens.
 */
export async function createDocumentCache(
  fullText: string,
  ttlSeconds: number = DEFAULT_CACHE_TTL,
): Promise<string> {
  const cache = await client.caches.create({
    model: "gemini-2.5-flash-001",
    config: {
      systemInstruction:
        "You will be given chunks from this text. For each chunk, provide a short succinct context to situate that chunk within the overall text for the purposes of improving search retrieval.",
      contents: [fullText],
      ttl: `${ttlSeconds}s`,
    },
  });

  return cache.name!;
}

/**
 * Generate contextual information for a chunk to improve search retrieval.
 * This implements Anthropic's Contextual Retrieval approach.
 *
 * @see https://www.anthropic.com/news/contextual-retrieval
 */
export async function generateContextForChunkWithCache(
  chunk: string,
  cacheName: string,
): Promise<string> {
  const response = await client.models.generateContent({
    model: "gemini-2.0-flash-001",
    contents: `Here is the chunk we want to situate within the document:
<chunk>
${chunk}
</chunk>

Please give a short succinct context to situate this chunk within the overall document for the purposes of improving search retrieval of the chunk. Answer only with the succinct context and nothing else.`,
    config: {
      cachedContent: cacheName,
    },
  });

  return response.text ?? "";
}

/**
 * Delete a cached document context when done processing.
 */
export async function deleteDocumentCache(cacheName: string): Promise<void> {
  await client.caches.delete({ name: cacheName });
}
