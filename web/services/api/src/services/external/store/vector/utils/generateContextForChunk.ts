import CacheLLMService from "../../../llm/cache";

/**
 * Generate contextual information for a chunk to improve search retrieval.
 * This implements Anthropic's Contextual Retrieval approach.
 *
 * Requires a pre-created cache from CacheLLMService.createCache().
 *
 * @see https://www.anthropic.com/news/contextual-retrieval
 */
export async function generateContextForChunk(
  chunk: string,
  cacheName: string,
): Promise<string> {
  const prompt = `You are given the text of a document.

Here is the chunk we want to situate within the document:
<chunk>
${chunk}
</chunk>

Please give a short succinct and concise context to situate this chunk within the overall document for the purposes of improving search retrieval of the chunk. Answer only with the succinct context and nothing else.`;

  return await CacheLLMService.generateWithCache({
    prompt,
    cacheName,
  });
}
