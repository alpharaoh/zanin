import type { RecordMetadata } from "@pinecone-database/pinecone";

/**
 * Base metadata that all searchable documents should include
 */
export interface SearchableMetadata extends RecordMetadata {
  documentId: string;
  text: string;
  chunkIndex: number;
}

/**
 * A search result with text content and metadata
 */
export interface SearchResult<
  T extends SearchableMetadata = SearchableMetadata,
> {
  id: string;
  score: number;
  text: string;
  metadata?: T;
}

/**
 * Search results grouped by document
 */
export interface DocumentSearchResult<
  T extends SearchableMetadata = SearchableMetadata,
> {
  documentId: string;
  chunks: SearchResult<T>[];
  topScore: number;
}

/**
 * Base search options
 */
export interface SearchOptions {
  /** Number of results to return (default: 10) */
  topK?: number;
  /** Metadata filter for Pinecone query */
  filter?: Record<string, unknown>;
  /** Enable reranking for better relevance (default: false) */
  rerank?: boolean;
  /** Number of results to return after reranking (default: topK) */
  rerankTopK?: number;
}

/**
 * Options for searching by prompt/query
 */
export interface SearchByPromptOptions extends SearchOptions {
  /** Transform query to keyword-style for better retrieval (default: false) */
  transformQuery?: boolean;
}

/**
 * Options for searching by document ID
 */
export interface SearchByDocumentOptions {
  /** Maximum chunks to return (default: 100) */
  limit?: number;
  /** Sort chunks by chunkIndex if available (default: true) */
  sortByIndex?: boolean;
}

/**
 * Options for finding similar documents
 */
export interface SimilarDocumentOptions extends SearchOptions {
  /** Exclude the source document from results (default: true) */
  excludeSource?: boolean;
}

/**
 * Options for grouped search results
 */
export interface GroupedSearchOptions extends SearchByPromptOptions {
  /** Maximum number of documents to return (default: 10) */
  maxDocuments?: number;
  /** Maximum chunks per document (default: 3) */
  chunksPerDocument?: number;
}

/**
 * Item to be reranked
 */
export interface RerankItem {
  id: string;
  text: string;
  score: number;
  metadata?: SearchableMetadata;
}

/**
 * Reranked result from Pinecone inference
 */
export interface RerankedResult {
  id: string;
  score: number;
  text: string;
  originalScore: number;
  metadata?: SearchableMetadata;
}
