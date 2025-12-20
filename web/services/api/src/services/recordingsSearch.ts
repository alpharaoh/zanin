import { VectorSearchService } from "./external/store/vector/search";
import type { SearchableMetadata } from "./external/store/vector/search";
import { RecordingsService } from "./recordings";

const RECORDINGS_INDEX = "recordings";

/**
 * Metadata stored with recording vectors
 */
interface RecordingChunkMetadata extends SearchableMetadata {
  recordingId: string;
  organizationId: string;
  userId: string;
  createdAt: string;
}

/**
 * A search result for a recording chunk
 */
export interface RecordingSearchResult {
  id: string;
  score: number;
  text: string;
  recordingId: string;
  chunkIndex?: number;
}

/**
 * A recording with its matching search results
 */
export interface RecordingWithMatches {
  recordingId: string;
  matches: RecordingSearchResult[];
  topScore: number;
}

/**
 * Search input options
 */
export interface SearchRecordingsInput {
  organizationId: string;
  query: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  rerank?: boolean;
  transformQuery?: boolean;
}

/**
 * Search response
 */
export interface SearchRecordingsResponse {
  results: RecordingWithMatches[];
  totalMatches: number;
}

/**
 * Build Pinecone filter for date range queries
 */
function buildDateFilter(
  startDate?: Date,
  endDate?: Date,
): Record<string, unknown> | undefined {
  if (!startDate && !endDate) {
    return undefined;
  }

  const filter: Record<string, unknown> = {};

  if (startDate && endDate) {
    filter.createdAt = {
      $gte: startDate.toISOString(),
      $lte: endDate.toISOString(),
    };
  } else if (startDate) {
    filter.createdAt = { $gte: startDate.toISOString() };
  } else if (endDate) {
    filter.createdAt = { $lte: endDate.toISOString() };
  }

  return filter;
}

export const RecordingsSearchService = {
  /**
   * Search recordings by semantic query with optional date filtering.
   * Returns recordings grouped by document with their matching chunks.
   */
  search: async (
    input: SearchRecordingsInput,
  ): Promise<SearchRecordingsResponse> => {
    const {
      organizationId,
      query,
      startDate,
      endDate,
      limit = 10,
      rerank = false,
      transformQuery = false,
    } = input;

    const filter = buildDateFilter(startDate, endDate);

    // Search with grouping by document (recording)
    const groupedResults =
      await VectorSearchService.searchByPromptGrouped<RecordingChunkMetadata>(
        RECORDINGS_INDEX,
        organizationId,
        query,
        {
          maxDocuments: limit,
          chunksPerDocument: 3,
          filter,
          rerank,
          transformQuery,
        },
      );

    // Fetch full recording details for each result
    const results: RecordingWithMatches[] = [];

    for (const docResult of groupedResults) {
      results.push({
        recordingId: docResult.documentId,
        matches: docResult.chunks.map((chunk) => ({
          id: chunk.id,
          score: chunk.score,
          text: chunk.text,
          recordingId: docResult.documentId,
          chunkIndex: chunk.metadata?.chunkIndex,
        })),
        topScore: docResult.topScore,
      });
    }

    return {
      results,
      totalMatches: groupedResults.reduce(
        (acc, doc) => acc + doc.chunks.length,
        0,
      ),
    };
  },

  /**
   * Simple search returning just the matching chunks without full recording details.
   * Useful for quick searches or autocomplete.
   */
  searchChunks: async (
    organizationId: string,
    query: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      rerank?: boolean;
    } = {},
  ): Promise<RecordingSearchResult[]> => {
    const { startDate, endDate, limit = 10, rerank = false } = options;

    const filter = buildDateFilter(startDate, endDate);

    const results =
      await VectorSearchService.searchByPrompt<RecordingChunkMetadata>(
        RECORDINGS_INDEX,
        organizationId,
        query,
        {
          topK: limit,
          filter,
          rerank,
        },
      );

    return results.map((result) => ({
      id: result.id,
      score: result.score,
      text: result.text,
      recordingId: result.metadata?.recordingId ?? "",
      chunkIndex: result.metadata?.chunkIndex,
    }));
  },

  /**
   * Find recordings similar to a given recording.
   */
  findSimilar: async (
    organizationId: string,
    recordingId: string,
    limit: number = 5,
  ): Promise<RecordingWithMatches[]> => {
    const groupedResults =
      await VectorSearchService.searchByPromptGrouped<RecordingChunkMetadata>(
        RECORDINGS_INDEX,
        organizationId,
        "", // Empty query - we'll use the document's own embedding
        {
          maxDocuments: limit + 1, // +1 to account for excluding source
          chunksPerDocument: 2,
          filter: { recordingId: { $ne: recordingId } },
        },
      );

    const results: RecordingWithMatches[] = [];

    for (const docResult of groupedResults) {
      if (docResult.documentId === recordingId) {
        continue;
      }

      results.push({
        recordingId: docResult.documentId,
        matches: docResult.chunks.map((chunk) => ({
          id: chunk.id,
          score: chunk.score,
          text: chunk.text,
          recordingId: docResult.documentId,
          chunkIndex: chunk.metadata?.chunkIndex,
        })),
        topScore: docResult.topScore,
      });

      if (results.length >= limit) {
        break;
      }
    }

    return results;
  },
};
