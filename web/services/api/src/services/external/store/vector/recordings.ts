import type { RecordMetadata } from "@pinecone-database/pinecone";
import SimpleVectorService from "./simple";
import EmbeddingService from "./embedding";
import type { VectorRecord, VectorStats } from "./types";
import { chunkText } from "./utils/chunkText";

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
 * Options for upserting a recording
 */
export interface UpsertRecordingOptions {
  recordingId: string;
  organizationId: string;
  userId: string;
  transcript: string;
  chunkSize?: number;
  chunkOverlap?: number;
}

/**
 * Result of upserting a recording
 */
export interface UpsertRecordingResult {
  chunksUpserted: number;
  vectorIds: string[];
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
 * Domain service for vectorizing and searching recordings.
 * Builds on top of SimpleVectorService and EmbeddingService.
 */
const RecordingVectorService = {
  /**
   * Vectorize a recording transcript and store in Pinecone.
   * Chunks the transcript for better semantic search.
   */
  async upsertRecording(
    options: UpsertRecordingOptions,
  ): Promise<UpsertRecordingResult> {
    const {
      recordingId,
      organizationId,
      userId,
      transcript,
      chunkSize,
      chunkOverlap,
    } = options;

    const chunks = await chunkText(transcript, chunkSize, chunkOverlap);

    if (chunks.length === 0) {
      return { chunksUpserted: 0, vectorIds: [] };
    }

    const embeddings = await EmbeddingService.embedMany(chunks);

    const vectors: VectorRecord<RecordingChunkMetadata>[] = chunks.map(
      (text, index) => ({
        id: `${recordingId}-chunk-${index}`,
        values: embeddings[index],
        metadata: {
          recordingId,
          organizationId,
          userId,
          chunkIndex: index,
          totalChunks: chunks.length,
          text,
          createdAt: new Date().toISOString(),
        },
      }),
    );

    await SimpleVectorService.upsert(RECORDINGS_INDEX, organizationId, vectors);

    return {
      chunksUpserted: vectors.length,
      vectorIds: vectors.map((v) => v.id),
    };
  },

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
