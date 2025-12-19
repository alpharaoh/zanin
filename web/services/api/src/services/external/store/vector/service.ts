import { embed, embedMany } from "ai";
import { google } from "@ai-sdk/google";
import { pinecone, RECORDINGS_INDEX_NAME } from "./client";
import type {
  RecordMetadata,
  PineconeRecord,
  QueryOptions,
  ScoredPineconeRecord,
} from "@pinecone-database/pinecone";

// ============================================================================
// Types
// ============================================================================

export interface RecordingMetadata extends RecordMetadata {
  recordingId: string;
  organizationId: string;
  userId: string;
  chunkIndex: number;
  totalChunks: number;
  text: string;
  createdAt: string;
}

export interface UpsertRecordingOptions {
  recordingId: string;
  organizationId: string;
  userId: string;
  transcript: string;
  chunkSize?: number;
  chunkOverlap?: number;
}

export interface QueryRecordingsOptions {
  organizationId: string;
  query: string;
  topK?: number;
  filter?: Record<string, unknown>;
  includeMetadata?: boolean;
}

export interface QueryResult {
  id: string;
  score: number;
  metadata: RecordingMetadata;
}

export interface DeleteRecordingOptions {
  organizationId: string;
  recordingId: string;
}

// ============================================================================
// Constants
// ============================================================================

const EMBEDDING_MODEL = google.textEmbeddingModel("text-embedding-004");
const DEFAULT_CHUNK_SIZE = 1000; // characters
const DEFAULT_CHUNK_OVERLAP = 200; // characters
const DEFAULT_TOP_K = 10;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Split text into overlapping chunks for better semantic search
 */
function chunkText(
  text: string,
  chunkSize: number = DEFAULT_CHUNK_SIZE,
  overlap: number = DEFAULT_CHUNK_OVERLAP,
): string[] {
  const chunks: string[] = [];

  if (text.length <= chunkSize) {
    return [text];
  }

  let start = 0;
  while (start < text.length) {
    let end = start + chunkSize;

    // Try to break at sentence boundary
    if (end < text.length) {
      const lastPeriod = text.lastIndexOf(".", end);
      const lastQuestion = text.lastIndexOf("?", end);
      const lastExclamation = text.lastIndexOf("!", end);
      const lastBreak = Math.max(lastPeriod, lastQuestion, lastExclamation);

      if (lastBreak > start + chunkSize / 2) {
        end = lastBreak + 1;
      }
    }

    chunks.push(text.slice(start, end).trim());
    start = end - overlap;

    // Prevent infinite loop
    if (start >= text.length - overlap) {
      break;
    }
  }

  return chunks.filter((chunk) => chunk.length > 0);
}

/**
 * Generate embedding for a single text
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: EMBEDDING_MODEL,
    value: text,
  });
  return embedding;
}

/**
 * Generate embeddings for multiple texts
 */
async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const { embeddings } = await embedMany({
    model: EMBEDDING_MODEL,
    values: texts,
  });
  return embeddings;
}

// ============================================================================
// Service
// ============================================================================

const VectorDBService = {
  /**
   * Get the recordings index
   * Uses organization ID as namespace for multi-tenant isolation
   */
  getIndex() {
    return pinecone.index<RecordingMetadata>(RECORDINGS_INDEX_NAME);
  },

  /**
   * Upsert a recording's transcript into the vector database
   * Chunks the transcript and creates embeddings for each chunk
   */
  async upsertRecording(options: UpsertRecordingOptions): Promise<{
    chunksUpserted: number;
    vectorIds: string[];
  }> {
    const {
      recordingId,
      organizationId,
      userId,
      transcript,
      chunkSize = DEFAULT_CHUNK_SIZE,
      chunkOverlap = DEFAULT_CHUNK_OVERLAP,
    } = options;

    // Chunk the transcript
    const chunks = chunkText(transcript, chunkSize, chunkOverlap);

    if (chunks.length === 0) {
      return { chunksUpserted: 0, vectorIds: [] };
    }

    // Generate embeddings for all chunks
    const embeddings = await generateEmbeddings(chunks);

    // Create vectors with metadata
    const vectors: PineconeRecord<RecordingMetadata>[] = chunks.map(
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

    // Upsert to Pinecone using organization namespace
    const index = this.getIndex();
    const namespace = index.namespace(organizationId);

    // Batch upsert (Pinecone recommends batches of 100)
    const batchSize = 100;
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      await namespace.upsert(batch);
    }

    return {
      chunksUpserted: vectors.length,
      vectorIds: vectors.map((v) => v.id),
    };
  },

  /**
   * Query recordings by semantic similarity
   */
  async queryRecordings(options: QueryRecordingsOptions): Promise<QueryResult[]> {
    const {
      organizationId,
      query,
      topK = DEFAULT_TOP_K,
      filter,
      includeMetadata = true,
    } = options;

    // Generate embedding for query
    const queryEmbedding = await generateEmbedding(query);

    // Query Pinecone
    const index = this.getIndex();
    const namespace = index.namespace(organizationId);

    const queryOptions: QueryOptions = {
      vector: queryEmbedding,
      topK,
      includeMetadata,
    };

    if (filter) {
      queryOptions.filter = filter;
    }

    const results = await namespace.query(queryOptions);

    return (results.matches || []).map(
      (match: ScoredPineconeRecord<RecordingMetadata>) => ({
        id: match.id,
        score: match.score ?? 0,
        metadata: match.metadata as RecordingMetadata,
      }),
    );
  },

  /**
   * Delete all vectors for a specific recording
   */
  async deleteRecording(options: DeleteRecordingOptions): Promise<void> {
    const { organizationId, recordingId } = options;

    const index = this.getIndex();
    const namespace = index.namespace(organizationId);

    // Delete by metadata filter
    await namespace.deleteMany({
      filter: {
        recordingId: { $eq: recordingId },
      },
    });
  },

  /**
   * Delete all vectors for an organization
   */
  async deleteOrganization(organizationId: string): Promise<void> {
    const index = this.getIndex();
    await index.namespace(organizationId).deleteAll();
  },

  /**
   * Get statistics for an organization's namespace
   */
  async getOrganizationStats(organizationId: string): Promise<{
    vectorCount: number;
  }> {
    const index = this.getIndex();
    const stats = await index.describeIndexStats();

    const namespaceStats = stats.namespaces?.[organizationId];

    return {
      vectorCount: namespaceStats?.recordCount ?? 0,
    };
  },

  /**
   * Search for similar recordings and group results by recording
   */
  async searchRecordings(
    organizationId: string,
    query: string,
    options: {
      topK?: number;
      recordingId?: string;
    } = {},
  ): Promise<
    {
      recordingId: string;
      userId: string;
      topScore: number;
      matchedChunks: {
        text: string;
        score: number;
        chunkIndex: number;
      }[];
    }[]
  > {
    const { topK = 20, recordingId } = options;

    const filter: Record<string, unknown> = {};
    if (recordingId) {
      filter.recordingId = { $eq: recordingId };
    }

    const results = await this.queryRecordings({
      organizationId,
      query,
      topK,
      filter: Object.keys(filter).length > 0 ? filter : undefined,
    });

    // Group by recording
    const grouped = new Map<
      string,
      {
        userId: string;
        chunks: { text: string; score: number; chunkIndex: number }[];
      }
    >();

    for (const result of results) {
      const { recordingId: recId, userId, text, chunkIndex } = result.metadata;

      if (!grouped.has(recId)) {
        grouped.set(recId, { userId, chunks: [] });
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
};

export default VectorDBService;
