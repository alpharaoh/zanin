import { embed, embedMany } from "ai";
import { google } from "@ai-sdk/google";

const EMBEDDING_MODEL = google.textEmbeddingModel("text-embedding-004");

/**
 * Service for generating text embeddings.
 * Uses Google's text-embedding-004 model (768 dimensions).
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
