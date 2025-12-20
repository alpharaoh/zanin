import SimpleVectorService from "../simple";
import EmbeddingService from "../embedding";
import { transformQuery } from "./queryTransformer";
import { rerank } from "./reranker";
import type {
  SearchableMetadata,
  SearchResult,
  DocumentSearchResult,
  SearchByPromptOptions,
  SearchByDocumentOptions,
  SimilarDocumentOptions,
  GroupedSearchOptions,
  RerankItem,
} from "./types";

/**
 * Overfetch multiplier when reranking is enabled.
 * Fetches 3x the desired results to give reranker more candidates.
 */
const RERANK_OVERFETCH_MULTIPLIER = 3;

/**
 * Default values for search options
 */
const DEFAULTS = {
  topK: 10,
  maxDocuments: 10,
  chunksPerDocument: 3,
  documentChunkLimit: 100,
};

/**
 * Advanced vector search service with query transformation, reranking, and result grouping.
 * Built on top of SimpleVectorService and EmbeddingService.
 */
const VectorSearchService = {
  /**
   * Search vectors by a natural language prompt.
   * Optionally transforms the query and reranks results for better relevance.
   *
   * @param indexName - Pinecone index name
   * @param namespace - Namespace within the index
   * @param prompt - Natural language search query
   * @param options - Search options
   */
  async searchByPrompt<T extends SearchableMetadata = SearchableMetadata>(
    indexName: string,
    namespace: string,
    prompt: string,
    options: SearchByPromptOptions = {},
  ): Promise<SearchResult<T>[]> {
    const {
      topK = DEFAULTS.topK,
      filter,
      rerank: shouldRerank = false,
      rerankTopK,
      transformQuery: shouldTransform = false,
    } = options;

    const searchQuery = shouldTransform ? await transformQuery(prompt) : prompt;

    const queryEmbedding = await EmbeddingService.embed(searchQuery);

    // If reranking, overfetch to give reranker more candidates
    const fetchTopK = shouldRerank ? topK * RERANK_OVERFETCH_MULTIPLIER : topK;

    const results = await SimpleVectorService.query<T>(indexName, namespace, {
      vector: queryEmbedding,
      topK: fetchTopK,
      filter,
      includeMetadata: true,
    });

    const searchResults: SearchResult<T>[] = results.map((r) => ({
      id: r.id,
      score: r.score,
      text: r.metadata?.text ?? "",
      metadata: r.metadata,
    }));

    if (shouldRerank && searchResults.length > 0) {
      const rerankItems: RerankItem[] = searchResults.map((r) => ({
        id: r.id,
        text: r.text,
        score: r.score,
        metadata: r.metadata,
      }));

      const reranked = await rerank(prompt, rerankItems, rerankTopK ?? topK);

      return reranked.map((r) => ({
        id: r.id,
        score: r.score,
        text: r.text,
        metadata: r.metadata as T | undefined,
      }));
    }

    return searchResults.slice(0, topK);
  },

  /**
   * Get all chunks for a specific document by its ID.
   *
   * @param indexName - Pinecone index name
   * @param namespace - Namespace within the index
   * @param documentId - The document ID to fetch chunks for
   * @param options - Search options
   */
  async searchByDocumentId<T extends SearchableMetadata = SearchableMetadata>(
    indexName: string,
    namespace: string,
    documentId: string,
    options: SearchByDocumentOptions = {},
  ): Promise<SearchResult<T>[]> {
    const { limit = DEFAULTS.documentChunkLimit, sortByIndex = true } = options;

    // We need a vector to query, so we'll use a zero vector with filter
    // This is a workaround since Pinecone requires a vector for queries
    // We'll fetch by filter and use a high topK
    const dummyVector = new Array(3072).fill(0);

    const results = await SimpleVectorService.query<T>(indexName, namespace, {
      vector: dummyVector,
      topK: limit,
      filter: { documentId },
      includeMetadata: true,
    });

    const searchResults: SearchResult<T>[] = results.map((r) => ({
      id: r.id,
      score: r.score,
      text: r.metadata?.text ?? "",
      metadata: r.metadata,
    }));

    // Sort by chunk index if available and requested
    if (sortByIndex) {
      searchResults.sort((a, b) => {
        const indexA = a.metadata?.chunkIndex ?? 0;
        const indexB = b.metadata?.chunkIndex ?? 0;
        return indexA - indexB;
      });
    }

    return searchResults;
  },

  /**
   * Find documents similar to a given document.
   * Uses the document's embedding to find semantically similar content.
   *
   * @param indexName - Pinecone index name
   * @param namespace - Namespace within the index
   * @param documentId - The source document ID
   * @param options - Search options
   */
  async searchSimilarToDocument<
    T extends SearchableMetadata = SearchableMetadata,
  >(
    indexName: string,
    namespace: string,
    documentId: string,
    options: SimilarDocumentOptions = {},
  ): Promise<SearchResult<T>[]> {
    const {
      topK = DEFAULTS.topK,
      filter,
      rerank: shouldRerank = false,
      excludeSource = true,
    } = options;

    // Get the first chunk of the source document to use as reference
    const sourceChunks = await this.searchByDocumentId<T>(
      indexName,
      namespace,
      documentId,
      { limit: 1 },
    );

    if (sourceChunks.length === 0) {
      return [];
    }

    const sourceText = sourceChunks[0].text;
    const queryEmbedding = await EmbeddingService.embed(sourceText);

    const queryFilter = {
      ...filter,
      ...(excludeSource ? { documentId: { $ne: documentId } } : {}),
    };

    const fetchTopK = shouldRerank ? topK * RERANK_OVERFETCH_MULTIPLIER : topK;

    const results = await SimpleVectorService.query<T>(indexName, namespace, {
      vector: queryEmbedding,
      topK: fetchTopK,
      filter: Object.keys(queryFilter).length > 0 ? queryFilter : undefined,
      includeMetadata: true,
    });

    const searchResults: SearchResult<T>[] = results.map((r) => ({
      id: r.id,
      score: r.score,
      text: r.metadata?.text ?? "",
      metadata: r.metadata,
    }));

    if (shouldRerank && searchResults.length > 0) {
      const rerankItems: RerankItem[] = searchResults.map((r) => ({
        id: r.id,
        text: r.text,
        score: r.score,
        metadata: r.metadata,
      }));

      const reranked = await rerank(sourceText, rerankItems, topK);

      return reranked.map((r) => ({
        id: r.id,
        score: r.score,
        text: r.text,
        metadata: r.metadata as T | undefined,
      }));
    }

    return searchResults.slice(0, topK);
  },

  /**
   * Search by prompt and group results by document.
   * Returns documents ranked by their best matching chunk.
   *
   * @param indexName - Pinecone index name
   * @param namespace - Namespace within the index
   * @param prompt - Natural language search query
   * @param options - Search options
   */
  async searchByPromptGrouped<
    T extends SearchableMetadata = SearchableMetadata,
  >(
    indexName: string,
    namespace: string,
    prompt: string,
    options: GroupedSearchOptions = {},
  ): Promise<DocumentSearchResult<T>[]> {
    const {
      topK,
      maxDocuments = DEFAULTS.maxDocuments,
      chunksPerDocument = DEFAULTS.chunksPerDocument,
      transformQuery: shouldTransform = false,
      rerank: shouldRerank = false,
      filter,
    } = options;

    // Fetch more results to ensure we have enough unique documents
    const fetchTopK = topK ?? maxDocuments * chunksPerDocument * 2;

    // Search with higher topK to get enough results for grouping
    const results = await this.searchByPrompt<T>(indexName, namespace, prompt, {
      topK: fetchTopK,
      filter,
      transformQuery: shouldTransform,
      rerank: shouldRerank,
      rerankTopK: fetchTopK,
    });

    // Group results by documentId
    const grouped = new Map<string, SearchResult<T>[]>();

    for (const result of results) {
      const docId = result.metadata?.documentId;
      if (!docId) {
        continue;
      }

      if (!grouped.has(docId)) {
        grouped.set(docId, []);
      }

      const chunks = grouped.get(docId)!;
      if (chunks.length < chunksPerDocument) {
        chunks.push(result);
      }
    }

    // Convert to DocumentSearchResult and sort by top score
    const documentResults: DocumentSearchResult<T>[] = Array.from(
      grouped.entries(),
    ).map(([documentId, chunks]) => ({
      documentId,
      chunks,
      topScore: Math.max(...chunks.map((c) => c.score)),
    }));

    // Sort by top score descending
    documentResults.sort((a, b) => b.topScore - a.topScore);

    return documentResults.slice(0, maxDocuments);
  },

  /**
   * Perform a simple semantic search without any advanced features.
   * This is a convenience method that directly embeds and queries.
   *
   * @param indexName - Pinecone index name
   * @param namespace - Namespace within the index
   * @param query - Search query text
   * @param topK - Number of results to return
   * @param filter - Optional metadata filter
   */
  async semanticSearch<T extends SearchableMetadata = SearchableMetadata>(
    indexName: string,
    namespace: string,
    query: string,
    topK: number = DEFAULTS.topK,
    filter?: Record<string, unknown>,
  ): Promise<SearchResult<T>[]> {
    const queryEmbedding = await EmbeddingService.embed(query);

    const results = await SimpleVectorService.query<T>(indexName, namespace, {
      vector: queryEmbedding,
      topK,
      filter,
      includeMetadata: true,
    });

    return results.map((r) => ({
      id: r.id,
      score: r.score,
      text: r.metadata?.text ?? "",
      metadata: r.metadata,
    }));
  },
};

export default VectorSearchService;
