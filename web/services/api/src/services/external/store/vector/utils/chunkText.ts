import { TokenChunker } from "@chonkiejs/core";

export const DEFAULT_CHUNK_SIZE = 1000;
export const DEFAULT_CHUNK_OVERLAP = 200;

export async function chunkText(
  text: string,
  chunkSize: number = DEFAULT_CHUNK_SIZE,
  chunkOverlap: number = DEFAULT_CHUNK_OVERLAP,
): Promise<string[]> {
  const chunker = await TokenChunker.create({
    chunkSize: chunkSize,
    chunkOverlap: chunkOverlap,
  });
  const chunks = await chunker.chunk(text);
  return chunks.map((a) => a.text);
}
