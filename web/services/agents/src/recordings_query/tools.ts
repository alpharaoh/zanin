import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { tool } from "@langchain/core/tools";
import * as z from "zod";
import { parseISO, getUnixTime } from "date-fns";
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
 * Build Pinecone filter for date range queries.
 * Converts ISO date strings to Unix timestamps (seconds) for Pinecone.
 */
function buildDateFilter(
  startDate?: string,
  endDate?: string,
): Record<string, unknown> | undefined {
  if (!startDate && !endDate) {
    return undefined;
  }

  const filter: Record<string, unknown> = {};

  const startTs = startDate ? getUnixTime(parseISO(startDate)) : undefined;
  const endTs = endDate ? getUnixTime(parseISO(endDate)) : undefined;

  if (startTs && endTs) {
    filter.createdAtTs = {
      $gte: startTs,
      $lte: endTs,
    };
  } else if (startTs) {
    filter.createdAtTs = { $gte: startTs };
  } else if (endTs) {
    filter.createdAtTs = { $lte: endTs };
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
 * Tool to get detailed recording metadata from the database.
 * Can query by recording IDs, date range, or both.
 */
const getRecordingDetails = tool(
  async ({ recordingIds, organizationId, startDate, endDate }) => {
    const hasIds = recordingIds && recordingIds.length > 0;
    const hasDateFilter = startDate || endDate;

    if (!hasIds && !hasDateFilter) {
      return JSON.stringify({
        success: false,
        recordings: [],
        message:
          "Please provide either recording IDs or a date range to query.",
      });
    }

    const conditions = [
      eq(recordings.organizationId, organizationId),
      isNull(recordings.deletedAt),
    ];

    if (hasIds) {
      conditions.push(inArray(recordings.id, recordingIds!));
    }
    if (startDate) {
      conditions.push(gte(recordings.createdAt, parseISO(startDate)));
    }
    if (endDate) {
      conditions.push(lte(recordings.createdAt, parseISO(endDate)));
    }

    const results = await db
      .select()
      .from(recordings)
      .where(and(...conditions))
      .orderBy(recordings.createdAt);

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

    // Only track notFound if specific IDs were requested
    let notFoundIds: string[] | undefined;
    if (hasIds) {
      const foundIds = new Set(foundRecordings.map((r) => r.id));
      notFoundIds = recordingIds!.filter((id) => !foundIds.has(id));
      if (notFoundIds.length === 0) {
        notFoundIds = undefined;
      }
    }

    const message = hasIds
      ? `Found ${foundRecordings.length} of ${recordingIds!.length} recording(s).`
      : `Found ${foundRecordings.length} recording(s) in the specified date range.`;

    return JSON.stringify({
      success: true,
      recordings: foundRecordings,
      notFound: notFoundIds,
      message,
    });
  },
  {
    name: "get_recording_details",
    description:
      "Get detailed information about recordings including title, summary, transcript, speaker labels, and AI analysis. Can query by specific recording IDs, by date range, or both. Use date range without IDs to find all recordings in a time period (e.g., 'what happened yesterday').",
    schema: z.object({
      recordingIds: z
        .array(z.string())
        .optional()
        .describe(
          "Optional list of recording IDs to fetch. If omitted, will query by date range instead.",
        ),
      organizationId: z
        .string()
        .describe("The organization ID the recordings belong to"),
      startDate: z
        .string()
        .optional()
        .describe(
          "Start date filter in ISO format (e.g., '2024-01-15T00:00:00Z'). Returns recordings created on or after this date.",
        ),
      endDate: z
        .string()
        .optional()
        .describe(
          "End date filter in ISO format (e.g., '2024-01-15T23:59:59Z'). Returns recordings created on or before this date.",
        ),
    }),
  },
);

export const searchRecordingsTool = searchRecordings;
export const getRecordingDetailsTool = getRecordingDetails;

export const allTools = [searchRecordings, getRecordingDetails];

export const modelWithTools = model.bindTools(allTools);
