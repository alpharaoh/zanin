import { embed } from "ai";
import { google } from "@ai-sdk/google";

const EMBEDDING_MODEL = google.textEmbeddingModel("gemini-embedding-001");

export async function embedText(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: EMBEDDING_MODEL,
    value: text,
  });
  return embedding;
}
