import { VectorSearchService } from "./external/store/vector/search";
import type { SearchableMetadata } from "./external/store/vector/search";
import { SimpleLLMService } from "./external/llm/simple";
import { RECORDINGS_INDEX } from "./recordings";

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
 * Ask input options
 */
export interface AskRecordingsInput {
  organizationId: string;
  question: string;
  recordingId?: string;
  startDate?: Date;
  endDate?: Date;
  maxSources?: number;
}

/**
 * Source used to answer the question
 */
export interface AnswerSource {
  recordingId: string;
  text: string;
  score: number;
}

/**
 * Ask response with LLM-generated answer
 */
export interface AskRecordingsResponse {
  answer: string;
  sources: AnswerSource[];
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

  /**
   * Ask a question and get an LLM-generated answer based on recording transcripts.
   * Uses RAG (Retrieval Augmented Generation) to find relevant context and generate an answer.
   */
  ask: async (input: AskRecordingsInput): Promise<AskRecordingsResponse> => {
    const {
      organizationId,
      question,
      recordingId,
      startDate,
      endDate,
      maxSources = 5,
    } = input;

    const dateFilter = buildDateFilter(startDate, endDate);

    let filter: Record<string, unknown> | undefined;
    if (dateFilter || recordingId) {
      filter = { ...dateFilter };
      if (recordingId) {
        filter.recordingId = recordingId;
      }
    }

    // Search for relevant chunks with reranking for better quality
    const searchResults =
      await VectorSearchService.searchByPrompt<RecordingChunkMetadata>(
        RECORDINGS_INDEX,
        organizationId,
        question,
        {
          topK: maxSources,
          filter,
          rerank: true,
          transformQuery: true,
        },
      );

    if (searchResults.length === 0) {
      return {
        answer:
          "I couldn't find any relevant information in your recordings to answer this question.",
        sources: [],
      };
    }

    // Build context from search results
    const sources: AnswerSource[] = searchResults.map((result) => ({
      recordingId: result.metadata?.recordingId ?? "",
      text: result.text,
      score: result.score,
    }));

    const context = sources
      .map((source, idx) => `[Source ${idx + 1}]: ${source.text}`)
      .join("\n\n");

    // Generate answer using LLM
    const prompt = `You are a helpful assistant that answers questions based on the user's recorded conversations and meetings.

Use the following context from the user's recordings to answer their question. Be concise and direct. If the context doesn't contain enough information to fully answer the question, say so and provide what you can based on the available information.

Context from recordings:
${context}

Question: ${question}

Answer:`;

    const answer = await SimpleLLMService.generateText(prompt);

    return {
      answer: answer.trim(),
      sources,
    };
  },
};
