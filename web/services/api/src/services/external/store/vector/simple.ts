import { pinecone } from "./client";
import type { RecordMetadata } from "@pinecone-database/pinecone";
import type {
  VectorRecord,
  QueryResult,
  QueryOptions,
  VectorStats,
} from "./types";

const BATCH_SIZE = 100;
const DEFAULT_DIMENSION = 768; // Google text-embedding-004

// Track which indexes we've verified in memory to avoid repeated API calls
const verifiedIndexes = new Set<string>();

/**
 * Low-level Pinecone operations with no domain knowledge.
 * This is the infrastructure layer that can be used by any domain service.
 */
const SimpleVectorService = {
  /**
   * Upsert vectors to an index/namespace.
   * Automatically batches large upserts (Pinecone recommends batches of 100).
   * Creates the index if it doesn't exist.
   */
  async upsert<T extends RecordMetadata>(
    indexName: string,
    namespace: string,
    vectors: VectorRecord<T>[],
  ): Promise<void> {
    if (vectors.length === 0) {
      return;
    }

    await this.ensureIndex(indexName);

    const index = pinecone.index<T>(indexName);
    const ns = index.namespace(namespace);

    for (let i = 0; i < vectors.length; i += BATCH_SIZE) {
      const batch = vectors.slice(i, i + BATCH_SIZE);
      await ns.upsert(batch);
    }
  },

  /**
   * Query vectors by similarity.
   */
  async query<T extends RecordMetadata>(
    indexName: string,
    namespace: string,
    options: QueryOptions,
  ): Promise<QueryResult<T>[]> {
    const { vector, topK = 10, filter, includeMetadata = true } = options;

    const index = pinecone.index<T>(indexName);
    const ns = index.namespace(namespace);

    const results = await ns.query({
      vector,
      topK,
      filter,
      includeMetadata,
    });

    return (results.matches || []).map((match) => ({
      id: match.id,
      score: match.score ?? 0,
      metadata: match.metadata as T | undefined,
    }));
  },

  async deleteByIds(
    indexName: string,
    namespace: string,
    ids: string[],
  ): Promise<void> {
    if (ids.length === 0) {
      return;
    }

    const index = pinecone.index(indexName);
    const ns = index.namespace(namespace);

    await ns.deleteMany(ids);
  },

  /**
   * Delete vectors matching a metadata filter.
   */
  async deleteByFilter(
    indexName: string,
    namespace: string,
    filter: Record<string, unknown>,
  ): Promise<void> {
    const index = pinecone.index(indexName);
    const ns = index.namespace(namespace);

    await ns.deleteMany({ filter });
  },

  /**
   * Delete all vectors in a namespace.
   */
  async deleteNamespace(indexName: string, namespace: string): Promise<void> {
    const index = pinecone.index(indexName);
    await index.namespace(namespace).deleteAll();
  },

  /**
   * Get statistics for an index, optionally filtered by namespace.
   */
  async getStats(indexName: string, namespace?: string): Promise<VectorStats> {
    const index = pinecone.index(indexName);
    const stats = await index.describeIndexStats();

    if (namespace) {
      const nsStats = stats.namespaces?.[namespace];
      return {
        vectorCount: nsStats?.recordCount ?? 0,
      };
    }

    return {
      vectorCount: stats.totalRecordCount ?? 0,
    };
  },

  /**
   * Ensure an index exists, creating it if necessary.
   * Uses serverless spec on AWS.
   */
  async ensureIndex(
    indexName: string,
    dimension: number = DEFAULT_DIMENSION,
  ): Promise<void> {
    if (verifiedIndexes.has(indexName)) {
      return;
    }

    const existingIndexes = await pinecone.listIndexes();
    const exists = existingIndexes.indexes?.some(
      (idx) => idx.name === indexName,
    );

    if (!exists) {
      await pinecone.createIndex({
        name: indexName,
        dimension,
        metric: "cosine",
        spec: {
          serverless: {
            cloud: "aws",
            // We don't have starter plan so it will auto-fill us-east-1
            region: "europe-west4",
          },
        },
        waitUntilReady: true,
      });
    }

    verifiedIndexes.add(indexName);
  },
};

export default SimpleVectorService;
