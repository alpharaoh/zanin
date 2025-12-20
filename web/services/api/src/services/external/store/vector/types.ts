import type { RecordMetadata } from "@pinecone-database/pinecone";

/**
 * A vector record to be stored in Pinecone
 */
export interface VectorRecord<T extends RecordMetadata = RecordMetadata> {
  id: string;
  values: number[];
  metadata?: T;
}

/**
 * A query result from Pinecone
 */
export interface QueryResult<T extends RecordMetadata = RecordMetadata> {
  id: string;
  score: number;
  metadata?: T;
}

/**
 * Options for querying vectors
 */
export interface QueryOptions {
  vector: number[];
  topK?: number;
  filter?: Record<string, unknown>;
  includeMetadata?: boolean;
}

/**
 * Statistics for a namespace or index
 */
export interface VectorStats {
  vectorCount: number;
}
