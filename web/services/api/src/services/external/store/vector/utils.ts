export const DEFAULT_CHUNK_SIZE = 1000;
export const DEFAULT_CHUNK_OVERLAP = 200;

/**
 * Split text into overlapping chunks for better semantic search.
 * Attempts to break at sentence boundaries for cleaner chunks.
 */
export function chunkText(
  text: string,
  chunkSize: number = DEFAULT_CHUNK_SIZE,
  overlap: number = DEFAULT_CHUNK_OVERLAP,
): string[] {
  if (!text || text.length === 0) {
    return [];
  }

  if (text.length <= chunkSize) {
    return [text];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + chunkSize;

    // Try to break at sentence boundary if not at end of text
    if (end < text.length) {
      const searchWindow = text.slice(start, end);
      const lastPeriod = searchWindow.lastIndexOf(". ");
      const lastQuestion = searchWindow.lastIndexOf("? ");
      const lastExclamation = searchWindow.lastIndexOf("! ");
      const lastBreak = Math.max(lastPeriod, lastQuestion, lastExclamation);

      // Only use sentence boundary if it's in the latter half of the chunk
      if (lastBreak > chunkSize / 2) {
        end = start + lastBreak + 2; // +2 to include the punctuation and space
      }
    }

    const chunk = text.slice(start, end).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    // Move start forward, accounting for overlap
    start = end - overlap;

    // Prevent infinite loop if we're near the end
    if (start >= text.length - overlap) {
      break;
    }
  }

  return chunks;
}
