import { embed, embedMany } from "ai";
import { google } from "@ai-sdk/google";

// 3072 dimensions, 2048 max tokens
const EMBEDDING_MODEL = google.textEmbeddingModel("gemini-embedding-001");

/**
 * Service for generating text embeddings.
 */
const EmbeddingService = {
  async embed(text: string): Promise<number[]> {
    const { embedding } = await embed({
      model: EMBEDDING_MODEL,
      value: text,
    });
    return embedding;
  },

  async embedMany(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    const { embeddings } = await embedMany({
      model: EMBEDDING_MODEL,
      values: texts,
    });
    return embeddings;
  },
};

export default EmbeddingService;
