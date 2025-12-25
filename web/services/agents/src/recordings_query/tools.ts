import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { tool } from "@langchain/core/tools";
import * as z from "zod";
import { pinecone, RECORDINGS_INDEX } from "../lib/pinecone";
import { embedText } from "../lib/embedding";
import db from "../lib/db";
import { recordings, type SelectRecording } from "../lib/schema";
import { eq, and, isNull } from "drizzle-orm";

const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

/**
 * Tool to search recordings by semantic query
 */
const searchRecordings = tool(
  async ({ query, organizationId, limit }) => {
    const queryEmbedding = await embedText(query);

    const index = pinecone.index(RECORDINGS_INDEX);
    const ns = index.namespace(organizationId);

    const results = await ns.query({
      vector: queryEmbedding,
      topK: limit,
      includeMetadata: true,
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
      "Search for recordings that match a query. Use this to find recordings related to specific topics, conversations, people, or events. Returns recording IDs and relevant text excerpts.",
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
        .describe(
          "Maximum number of vector results to retrieve (default: 20)",
        ),
    }),
  },
);

/**
 * Tool to get detailed recording metadata from the database
 */
const getRecordingDetails = tool(
  async ({ recordingId, organizationId }) => {
    const result = await db
      .select()
      .from(recordings)
      .where(
        and(
          eq(recordings.id, recordingId),
          eq(recordings.organizationId, organizationId),
          isNull(recordings.deletedAt),
        ),
      )
      .limit(1);

    const recording = result[0] as SelectRecording | undefined;

    if (!recording) {
      return JSON.stringify({
        success: false,
        error: "Recording not found",
      });
    }

    // Return relevant metadata for answering questions
    return JSON.stringify({
      success: true,
      recording: {
        id: recording.id,
        title: recording.title,
        createdAt: recording.createdAt,
        finishedAt: recording.finishedAt,
        duration: recording.originalDuration,
        summary: recording.summary,
        ownerAnalysis: recording.ownerAnalysis,
        transcript: recording.transcript,
        speakerLabels: recording.speakerLabels,
      },
    });
  },
  {
    name: "get_recording_details",
    description:
      "Get detailed information about a specific recording including title, summary, transcript, speaker labels, and AI analysis. Use this after searching to get more context about a specific recording.",
    schema: z.object({
      recordingId: z.string().describe("The ID of the recording to fetch"),
      organizationId: z
        .string()
        .describe("The organization ID the recording belongs to"),
    }),
  },
);

export const searchRecordingsTool = searchRecordings;
export const getRecordingDetailsTool = getRecordingDetails;

export const allTools = [searchRecordings, getRecordingDetails];

export const modelWithTools = model.bindTools(allTools);
