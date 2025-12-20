import type { RecordMetadata } from "@pinecone-database/pinecone";
import SimpleVectorService from "./simple";
import EmbeddingService from "./embedding";
import type { VectorStats } from "./types";

const RECORDINGS_INDEX = "recordings";

/**
 * Metadata stored with each recording chunk in Pinecone
 */
export interface RecordingChunkMetadata extends RecordMetadata {
  recordingId: string;
  organizationId: string;
  userId: string;
  chunkIndex: number;
  totalChunks: number;
  text: string;
  createdAt: string;
}

/**
 * A matched chunk from search results
 */
export interface MatchedChunk {
  text: string;
  score: number;
  chunkIndex: number;
}

/**
 * Grouped search result by recording
 */
export interface RecordingSearchResult {
  recordingId: string;
  userId: string;
  topScore: number;
  matchedChunks: MatchedChunk[];
}

/**
 * Domain service for searching recordings.
 * Vectorization is handled by the generic vectorize Inngest function.
 */
const RecordingVectorService = {
  /**
   * Search for recordings by semantic similarity.
   * Results are grouped by recording with matched chunks.
   */
  async search(
    organizationId: string,
    query: string,
    options: {
      topK?: number;
      recordingId?: string;
    } = {},
  ): Promise<RecordingSearchResult[]> {
    const { topK = 20, recordingId } = options;

    const queryEmbedding = await EmbeddingService.embed(query);

    const filter: Record<string, unknown> | undefined = recordingId
      ? { recordingId: { $eq: recordingId } }
      : undefined;

    const results = await SimpleVectorService.query<RecordingChunkMetadata>(
      RECORDINGS_INDEX,
      organizationId,
      {
        vector: queryEmbedding,
        topK,
        filter,
        includeMetadata: true,
      },
    );

    // Group results by recording
    const grouped = new Map<
      string,
      { userId: string; chunks: MatchedChunk[] }
    >();

    for (const result of results) {
      if (!result.metadata) {
        continue;
      }

      const {
        recordingId: recId,
        userId: recUserId,
        text,
        chunkIndex,
      } = result.metadata;

      if (!grouped.has(recId)) {
        grouped.set(recId, { userId: recUserId, chunks: [] });
      }

      grouped.get(recId)!.chunks.push({
        text,
        score: result.score,
        chunkIndex,
      });
    }

    // Convert to array and sort by top score
    return Array.from(grouped.entries())
      .map(([recId, data]) => ({
        recordingId: recId,
        userId: data.userId,
        topScore: Math.max(...data.chunks.map((c) => c.score)),
        matchedChunks: data.chunks.sort((a, b) => b.score - a.score),
      }))
      .sort((a, b) => b.topScore - a.topScore);
  },

  /**
   * Delete all vectors for a specific recording.
   */
  async deleteRecording(
    organizationId: string,
    recordingId: string,
  ): Promise<void> {
    await SimpleVectorService.deleteByFilter(RECORDINGS_INDEX, organizationId, {
      recordingId: { $eq: recordingId },
    });
  },

  /**
   * Delete all vectors for an organization.
   */
  async deleteOrganization(organizationId: string): Promise<void> {
    await SimpleVectorService.deleteNamespace(RECORDINGS_INDEX, organizationId);
  },

  /**
   * Get statistics for an organization's recordings.
   */
  async getStats(organizationId: string): Promise<VectorStats> {
    return await SimpleVectorService.getStats(RECORDINGS_INDEX, organizationId);
  },
};

export default RecordingVectorService;
