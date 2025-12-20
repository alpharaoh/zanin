import { SimpleLLMService } from "../../../llm/simple";

const TRANSFORM_PROMPT = `Transform this search query into an optimized keyword-style query for semantic search.
Extract key concepts, entities, and relevant terms. Remove filler words and conversational phrases.
Return only the transformed query as a single line, nothing else.

Query: {query}`;

/**
 * Transforms natural language queries into keyword-optimized search queries.
 *
 * Examples:
 * - "What did we discuss about the marketing budget?" -> "marketing budget discussion planning allocation"
 * - "Can you find that conversation where John talked about sales?" -> "John sales conversation discussion"
 */
export async function transformQuery(query: string): Promise<string> {
  const prompt = TRANSFORM_PROMPT.replace("{query}", query);

  try {
    const transformed = await SimpleLLMService.generateText(prompt);
    const result = transformed.trim();

    // If the LLM returns something too short or empty, fall back to original
    if (result.length < 3) {
      return query;
    }

    return result;
  } catch {
    // On error, fall back to original query
    return query;
  }
}
