import { inngest } from "../../client";
import { NonRetriableError } from "inngest";
import type { RecordMetadata } from "@pinecone-database/pinecone";
import SimpleVectorService from "../../../services/external/store/vector/simple";
import EmbeddingService from "../../../services/external/store/vector/embedding";
import { chunkText } from "../../../services/external/store/vector/utils/chunkText";
import { generateContextForChunk } from "../../../services/external/store/vector/utils/generateContextForChunk";

// ============================================================================
// Types
// ============================================================================

export interface VectorizeOptions {
  useContextualEmbeddings?: boolean;
  chunkSize?: number;
  chunkOverlap?: number;
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

interface ChunkMetadata extends RecordMetadata {
  documentId: string;
  chunkIndex: number;
  totalChunks: number;
  text: string;
  createdAt: string;
}

// ============================================================================
// Function
// ============================================================================

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

    // Validate input
    if (!text || text.trim().length === 0) {
      throw new NonRetriableError("Text content is empty");
    }

    const useContextualEmbeddings = options?.useContextualEmbeddings ?? false;
    const chunkSize = options?.chunkSize;
    const chunkOverlap = options?.chunkOverlap;

    // Step 1: Chunk the text
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

    // Step 2: Optionally generate contextual embeddings
    let textsToEmbed = chunks;

    if (useContextualEmbeddings) {
      const contextualChunks: string[] = [];

      for (let i = 0; i < chunks.length; i++) {
        const contextualChunk = await step.run(
          `generate-context-${i}`,
          async () => {
            const context = await generateContextForChunk(chunks[i], text);
            return `${context}\n\n${chunks[i]}`;
          },
        );
        contextualChunks.push(contextualChunk);
      }

      textsToEmbed = contextualChunks;
      logger.info("Generated contextual embeddings for all chunks");
    }

    // Step 3: Generate embeddings
    const embeddings = await step.run("generate-embeddings", async () => {
      return await EmbeddingService.embedMany(textsToEmbed);
    });

    logger.info(`Generated ${embeddings.length} embeddings`);

    // Step 4: Build vectors with metadata
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

    // Step 5: Upsert to vector DB
    await step.run("upsert-vectors", async () => {
      await SimpleVectorService.upsert(indexName, namespace, vectors);
    });

    logger.info(`Upserted ${vectors.length} vectors to ${indexName}/${namespace}`);

    return {
      success: true,
      documentId,
      chunksUpserted: vectors.length,
      vectorIds: vectors.map((v) => v.id),
    };
  },
);

export default vectorize;
