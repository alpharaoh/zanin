import { GoogleGenAI, type CachedContent } from "@google/genai";
import { env } from "@zanin/env/server";

const client = new GoogleGenAI({ apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY });

const DEFAULT_CACHE_TTL_SECONDS = 300;
const DEFAULT_CACHE_MODEL = "gemini-2.5-flash-preview-05-20";
const DEFAULT_GENERATE_MODEL = "gemini-2.5-flash-preview-05-20";

export interface CreateCacheOptions {
  systemInstruction: string;
  contents: string;
  ttlSeconds?: number;
  model?: string;
  displayName?: string;
}

export interface GenerateWithCacheOptions {
  prompt: string;
  cacheName: string;
  model?: string;
}

/**
 * Service for LLM operations with Google's context caching.
 * Context caching reduces costs when repeatedly using the same large context.
 *
 * @see https://ai.google.dev/gemini-api/docs/caching
 */
const CacheLLMService = {
  async createCache(options: CreateCacheOptions): Promise<CachedContent> {
    const {
      systemInstruction,
      contents,
      ttlSeconds = DEFAULT_CACHE_TTL_SECONDS,
      model = DEFAULT_CACHE_MODEL,
      displayName,
    } = options;

    const cache = await client.caches.create({
      model,
      config: {
        systemInstruction,
        contents: [contents],
        ttl: `${ttlSeconds}s`,
        displayName,
      },
    });

    return cache;
  },

  async generateWithCache(options: GenerateWithCacheOptions): Promise<string> {
    const { prompt, cacheName, model = DEFAULT_GENERATE_MODEL } = options;

    const response = await client.models.generateContent({
      model,
      contents: prompt,
      config: {
        cachedContent: cacheName,
      },
    });

    return response.text ?? "";
  },

  async deleteCache(cacheName: string): Promise<void> {
    await client.caches.delete({ name: cacheName });
  },

  async getCache(cacheName: string): Promise<CachedContent> {
    return await client.caches.get({ name: cacheName });
  },
};

export default CacheLLMService;
