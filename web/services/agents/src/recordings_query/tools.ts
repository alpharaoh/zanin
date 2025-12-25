import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { tool } from "@langchain/core/tools";
import * as z from "zod";
import { pinecone, RECORDINGS_INDEX } from "../lib/pinecone";
import { embedText } from "../lib/embedding";
import db from "../lib/db";
import { recordings, type SelectRecording } from "../lib/schema";
import { eq, and, isNull, inArray, gte, lte } from "drizzle-orm";

const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

/**
 * Build Pinecone filter for date range queries
 */
function buildDateFilter(
  startDate?: string,
  endDate?: string,
): Record<string, unknown> | undefined {
  if (!startDate && !endDate) {
    return undefined;
  }

  const filter: Record<string, unknown> = {};

  if (startDate && endDate) {
    filter.createdAt = {
      $gte: startDate,
      $lte: endDate,
    };
  } else if (startDate) {
    filter.createdAt = { $gte: startDate };
  } else if (endDate) {
    filter.createdAt = { $lte: endDate };
  }

  return filter;
}

/**
 * Tool to search recordings by semantic query
 */
const searchRecordings = tool(
  async ({ query, organizationId, limit, startDate, endDate }) => {
    const queryEmbedding = await embedText(query);

    const index = pinecone.index(RECORDINGS_INDEX);
    const ns = index.namespace(organizationId);

    const filter = buildDateFilter(startDate, endDate);

    const results = await ns.query({
      vector: queryEmbedding,
      topK: limit,
      includeMetadata: true,
      filter,
    });

    if (!results.matches || results.matches.length === 0) {
      return JSON.stringify({
        success: true,
        results: [],
        message: "No relevant recordings found for this query.",
      });
    }

    // Group results by documentId (recording)
    const groupedResults = new Map<
      string,
      { texts: string[]; topScore: number }
    >();

    for (const match of results.matches) {
      const metadata = match.metadata as {
        documentId?: string;
        recordingId?: string;
        text?: string;
      };
      const recordingId = metadata?.documentId || metadata?.recordingId;
      const text = metadata?.text || "";

      if (!recordingId) {
        continue;
      }

      if (!groupedResults.has(recordingId)) {
        groupedResults.set(recordingId, {
          texts: [],
          topScore: match.score ?? 0,
        });
      }

      const group = groupedResults.get(recordingId)!;
      if (group.texts.length < 3) {
        group.texts.push(text);
      }
      if ((match.score ?? 0) > group.topScore) {
        group.topScore = match.score ?? 0;
      }
    }

    const searchResults = Array.from(groupedResults.entries())
      .map(([recordingId, data]) => ({
        recordingId,
        relevantExcerpts: data.texts,
        relevanceScore: data.topScore,
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore);

    return JSON.stringify({
      success: true,
      results: searchResults,
      message: `Found ${searchResults.length} relevant recording(s).`,
    });
  },
  {
    name: "search_recordings",
    description:
      "Search for recordings that match a query. Use this to find recordings related to specific topics, conversations, people, or events. Returns recording IDs and relevant text excerpts. Supports optional date filtering.",
    schema: z.object({
      query: z
        .string()
        .describe(
          "The search query to find relevant recordings. Be specific about what you're looking for.",
        ),
      organizationId: z
        .string()
        .describe("The organization ID to search within"),
      limit: z
        .number()
        .default(20)
        .describe("Maximum number of vector results to retrieve (default: 20)"),
      startDate: z
        .string()
        .optional()
        .describe(
          "Optional start date filter in ISO format (e.g., '2024-01-15T00:00:00Z'). Only returns recordings created on or after this date.",
        ),
      endDate: z
        .string()
        .optional()
        .describe(
          "Optional end date filter in ISO format (e.g., '2024-01-15T23:59:59Z'). Only returns recordings created on or before this date.",
        ),
    }),
  },
);

/**
 * Tool to get detailed recording metadata from the database
 */
const getRecordingDetails = tool(
  async ({ recordingIds, organizationId, startDate, endDate }) => {
    if (recordingIds.length === 0) {
      return JSON.stringify({
        success: true,
        recordings: [],
        message: "No recording IDs provided.",
      });
    }

    const conditions = [
      inArray(recordings.id, recordingIds),
      eq(recordings.organizationId, organizationId),
      isNull(recordings.deletedAt),
    ];

    if (startDate) {
      conditions.push(gte(recordings.createdAt, new Date(startDate)));
    }
    if (endDate) {
      conditions.push(lte(recordings.createdAt, new Date(endDate)));
    }

    const results = await db
      .select()
      .from(recordings)
      .where(and(...conditions));

    const foundRecordings = (results as SelectRecording[]).map((recording) => ({
      id: recording.id,
      title: recording.title,
      createdAt: recording.createdAt,
      finishedAt: recording.finishedAt,
      duration: recording.originalDuration,
      summary: recording.summary,
      ownerAnalysis: recording.ownerAnalysis,
      transcript: recording.transcript,
      speakerLabels: recording.speakerLabels,
    }));

    const foundIds = new Set(foundRecordings.map((r) => r.id));
    const notFoundIds = recordingIds.filter((id) => !foundIds.has(id));

    return JSON.stringify({
      success: true,
      recordings: foundRecordings,
      notFound: notFoundIds.length > 0 ? notFoundIds : undefined,
      message: `Found ${foundRecordings.length} of ${recordingIds.length} recording(s).`,
    });
  },
  {
    name: "get_recording_details",
    description:
      "Get detailed information about multiple recordings including title, summary, transcript, speaker labels, and AI analysis. Use this after searching to get more context about relevant recordings. Supports optional date filtering.",
    schema: z.object({
      recordingIds: z
        .array(z.string())
        .describe("The IDs of the recordings to fetch"),
      organizationId: z
        .string()
        .describe("The organization ID the recordings belong to"),
      startDate: z
        .string()
        .optional()
        .describe(
          "Optional start date filter in ISO format (e.g., '2024-01-15T00:00:00Z'). Only returns recordings created on or after this date.",
        ),
      endDate: z
        .string()
        .optional()
        .describe(
          "Optional end date filter in ISO format (e.g., '2024-01-15T23:59:59Z'). Only returns recordings created on or before this date.",
        ),
    }),
  },
);

export const searchRecordingsTool = searchRecordings;
export const getRecordingDetailsTool = getRecordingDetails;

export const allTools = [searchRecordings, getRecordingDetails];

export const modelWithTools = model.bindTools(allTools);
