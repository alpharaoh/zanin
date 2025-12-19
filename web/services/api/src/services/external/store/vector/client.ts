import { Pinecone } from "@pinecone-database/pinecone";
import { env } from "@zanin/env/server";

export const pinecone = new Pinecone({
  apiKey: env.PINECONE_API_KEY,
});

// Index name for recordings - create this in Pinecone dashboard
// Recommended settings: dimension=768 (for text-embedding-004), metric=cosine
export const RECORDINGS_INDEX_NAME = "recordings";
