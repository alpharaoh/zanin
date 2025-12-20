import { eq, isNull, and } from "drizzle-orm";
import { omit } from "lodash";
import db from "@zanin/db";
import { recordings, SelectRecording } from "@zanin/db/schema";
import { inngest } from "../inngest/client";
import BlobStorageService from "./external/store/blob/service";

export type RecordingResponse = Omit<SelectRecording, "deletedAt">;

export interface CreateRecordingInput {
  organizationId: string;
  userId: string;
  audioBuffer: Buffer;
  filename?: string;
}

export interface ListRecordingsInput {
  organizationId: string;
  userId?: string;
  limit?: number;
  offset?: number;
}

function toRecordingResponse(recording: SelectRecording): RecordingResponse {
  return omit(recording, ["deletedAt"]);
}

export const RecordingsService = {
  /**
   * Create a new recording, upload audio to S3, and trigger processing
   */
  create: async (input: CreateRecordingInput): Promise<RecordingResponse> => {
    const { organizationId, userId, audioBuffer } = input;

    const timestamp = Date.now();
    const path = `audio/${organizationId}/${userId}/raw-${timestamp}.wav`;
    const { url: rawAudioUrl } = await BlobStorageService.upload(
      path,
      audioBuffer,
      { contentType: "audio/wav" },
    );

    const [recording] = await db
      .insert(recordings)
      .values({
        organizationId,
        userId,
        status: "processing",
        rawAudioUrl,
      })
      .returning();

    await inngest.send({
      name: "audio/process.audio",
      data: {
        recordingId: recording.id,
        organizationId,
        userId,
        audioUrl: rawAudioUrl,
      },
    });

    return toRecordingResponse(recording);
  },

  /**
   * Get a recording by ID
   */
  getById: async (
    id: string,
    organizationId: string,
  ): Promise<RecordingResponse | null> => {
    const [recording] = await db
      .select()
      .from(recordings)
      .where(
        and(
          eq(recordings.id, id),
          eq(recordings.organizationId, organizationId),
          isNull(recordings.deletedAt),
        ),
      )
      .limit(1);

    if (!recording) {
      return null;
    }

    return toRecordingResponse(recording);
  },

  /**
   * List recordings for an organization
   */
  list: async (input: ListRecordingsInput): Promise<RecordingResponse[]> => {
    const { organizationId, userId, limit = 50, offset = 0 } = input;

    const conditions = [
      eq(recordings.organizationId, organizationId),
      isNull(recordings.deletedAt),
    ];

    if (userId) {
      conditions.push(eq(recordings.userId, userId));
    }

    const results = await db
      .select()
      .from(recordings)
      .where(and(...conditions))
      .orderBy(recordings.createdAt)
      .limit(limit)
      .offset(offset);

    return results.map(toRecordingResponse);
  },

  /**
   * Soft delete a recording
   */
  delete: async (
    id: string,
    organizationId: string,
  ): Promise<RecordingResponse | null> => {
    const [recording] = await db
      .update(recordings)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(recordings.id, id),
          eq(recordings.organizationId, organizationId),
          isNull(recordings.deletedAt),
        ),
      )
      .returning();

    if (!recording) {
      return null;
    }

    return toRecordingResponse(recording);
  },
};
