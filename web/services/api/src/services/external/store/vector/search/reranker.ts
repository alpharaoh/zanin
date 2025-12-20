import { pinecone } from "../client";
import type { RerankItem, RerankedResult, SearchableMetadata } from "./types";

/**
 * Rerank model to use. Options:
 * - "bge-reranker-v2-m3": Multilingual reranker, good general purpose
 * - "pinecone-rerank-v0": Pinecone's state-of-the-art reranker
 */
const RERANK_MODEL = "bge-reranker-v2-m3";

/**
 * Maximum number of documents that can be reranked in a single batch
 */
const MAX_BATCH_SIZE = 100;

/**
 * Reranks search results using Pinecone's inference API.
 * Uses a cross-encoder model to score query-document pairs for better relevance.
 *
 * @param query - The search query to rank against
 * @param items - Items to rerank (must include text field)
 * @param topN - Number of results to return (default: all items)
 * @returns Reranked results sorted by relevance score
 */
export async function rerank(
  query: string,
  items: RerankItem[],
  topN?: number,
): Promise<RerankedResult[]> {
  if (items.length === 0) {
    return [];
  }

  // Pinecone rerank has a max batch size
  const itemsToRerank = items.slice(0, MAX_BATCH_SIZE);

  // Prepare documents for reranking
  const documents = itemsToRerank.map((item) => ({
    id: item.id,
    text: item.text,
  }));

  const response = await pinecone.inference.rerank(
    RERANK_MODEL,
    query,
    documents,
    {
      topN: topN ?? itemsToRerank.length,
      returnDocuments: true,
    },
  );

  // Map reranked results back to our format with original metadata
  const results: RerankedResult[] = response.data.map((ranked) => {
    const originalItem = itemsToRerank.find(
      (item) => item.id === ranked.document?.id,
    );

    return {
      id: ranked.document?.id ?? "",
      score: ranked.score,
      text: ranked.document?.text ?? "",
      originalScore: originalItem?.score ?? 0,
      metadata: originalItem?.metadata as SearchableMetadata | undefined,
    };
  });

  return results;
}

/**
 * Reranks and filters results, keeping only those above a score threshold.
 *
 * @param query - The search query to rank against
 * @param items - Items to rerank
 * @param threshold - Minimum rerank score to keep (0-1)
 * @param topN - Maximum results to return
 */
export async function rerankWithThreshold(
  query: string,
  items: RerankItem[],
  threshold: number,
  topN?: number,
): Promise<RerankedResult[]> {
  const reranked = await rerank(query, items, topN);
  return reranked.filter((result) => result.score >= threshold);
}
