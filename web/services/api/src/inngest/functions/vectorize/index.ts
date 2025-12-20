import { inngest } from "../../client";
import { NonRetriableError } from "inngest";
import type { RecordMetadata } from "@pinecone-database/pinecone";
import SimpleVectorService from "../../../services/external/store/vector/simple";
import EmbeddingService from "../../../services/external/store/vector/embedding";
import CacheLLMService from "../../../services/external/llm/cache";
import { chunkText } from "../../../services/external/store/vector/utils/chunkText";
import { generateContextForChunk } from "../../../services/external/store/vector/utils/generateContextForChunk";

const CONTEXTUAL_SYSTEM_INSTRUCTION =
  "You will be given chunks from this text. For each chunk, provide a short succinct context to situate that chunk within the overall text for the purposes of improving search retrieval.";

export interface VectorizeOptions {
  useContextualEmbeddings?: boolean;
  chunkSize?: number;
  chunkOverlap?: number;
}

interface ChunkMetadata extends RecordMetadata {
  documentId: string;
  chunkIndex: number;
  totalChunks: number;
  text: string;
  createdAt: string;
}

type VectorizeData = {
  data: {
    indexName: string;
    namespace: string;
    documentId: string;
    text: string;
    metadata: Record<string, unknown>;
    options?: VectorizeOptions;
  };
};

export type VectorizeEvent = {
  "content/vectorize": VectorizeData;
};

export const vectorize = inngest.createFunction(
  {
    id: "vectorize",
    concurrency: 5,
    retries: 3,
  },
  { event: "content/vectorize" },
  async ({ event, step, logger }) => {
    const { indexName, namespace, documentId, text, metadata, options } =
      event.data;

    if (!text || text.trim().length === 0) {
      throw new NonRetriableError("Text content is empty");
    }

    const useContextualEmbeddings = options?.useContextualEmbeddings ?? false;
    const chunkSize = options?.chunkSize;
    const chunkOverlap = options?.chunkOverlap;

    const chunks = await step.run("chunk-text", async () => {
      return await chunkText(text, chunkSize, chunkOverlap);
    });

    if (chunks.length === 0) {
      return {
        success: true,
        documentId,
        chunksUpserted: 0,
        vectorIds: [],
      };
    }

    logger.info(`Chunked text into ${chunks.length} chunks`);

    // Optionally generate contextual embeddings using cached document context
    let textsToEmbed = chunks;

    if (useContextualEmbeddings) {
      // Create a cache for the full document to save tokens
      const cache = await step.run("create-document-cache", async () => {
        return await CacheLLMService.createCache({
          systemInstruction: CONTEXTUAL_SYSTEM_INSTRUCTION,
          contents: text,
        });
      });

      const cacheName = cache.name!;
      logger.info(`Created document cache: ${cacheName}`);

      const contextualChunks: string[] = [];

      for (let i = 0; i < chunks.length; i++) {
        const contextualChunk = await step.run(
          `generate-context-${i}`,
          async () => {
            const context = await generateContextForChunk(chunks[i], cacheName);
            return `${context}\n\n${chunks[i]}`;
          },
        );
        contextualChunks.push(contextualChunk);
      }

      // Clean up the cache
      await step.run("delete-document-cache", async () => {
        await CacheLLMService.deleteCache(cacheName);
      });

      textsToEmbed = contextualChunks;
      logger.info("Generated contextual embeddings for all chunks");
    }

    const embeddings = await step.run("generate-embeddings", async () => {
      return await EmbeddingService.embedMany(textsToEmbed);
    });

    logger.info(`Generated ${embeddings.length} embeddings`);

    const vectors = chunks.map((chunk, idx) => ({
      id: `${documentId}-chunk-${idx}`,
      values: embeddings[idx],
      metadata: {
        ...metadata,
        documentId,
        chunkIndex: idx,
        totalChunks: chunks.length,
        text: chunk, // Store original chunk, not contextual version
        createdAt: new Date().toISOString(),
      } as ChunkMetadata,
    }));

    await step.run("upsert-vectors", async () => {
      await SimpleVectorService.upsert(indexName, namespace, vectors);
    });

    logger.info(
      `Upserted ${vectors.length} vectors to ${indexName}/${namespace}`,
    );

    return {
      success: true,
      documentId,
      chunksUpserted: vectors.length,
      vectorIds: vectors.map((v) => v.id),
    };
  },
);

export default vectorize;
