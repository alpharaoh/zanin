import { omit } from "lodash";
import { insertRecording } from "@zanin/db/queries/insert/insertRecording";
import { selectRecording } from "@zanin/db/queries/select/one/selectRecording";
import { listRecordings } from "@zanin/db/queries/select/many/listRecordings";
import { updateRecording } from "@zanin/db/queries/update/updateRecording";
import { inngest } from "../inngest/client";
import BlobStorageService from "./external/store/blob/service";
import SimpleVectorService from "./external/store/vector/simple";
import { SelectRecording } from "@zanin/db/schema";

export const RECORDINGS_INDEX = "recordings";

export interface OwnerAnalysis {
  communicationStyle: string;
  strengths: string[];
  improvements: string[];
  conversationRole: string;
  keyBehaviors: string[];
  speakingPercentage: number;
  turnCount: number;
}

export interface Recording {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  createdAt: Date;
  updatedAt: Date;
  finishedAt: Date | undefined;
  processingError: string | undefined;
  title: string | undefined;
  rawAudioUrl: string;
  cleanedAudioUrl: string | undefined;
  confidence: number | undefined;
  originalDuration: number | undefined;
  transcript: {
    end: number;
    start: number;
    content: string;
    speaker: "ME" | string;
    wordCount: number;
    speakerNumber: number;
  }[];
  vadSegments: {
    segements: {
      end: number;
      start: number;
    };
  }[];
  speakerLabels: {};
  metadata: {
    language: "en";
    speakerIdentification: {
      otherSpeakingSeconds: number;
      ownerSpeakingSeconds: number;
    };
  };
  summary: string | undefined;
  ownerAnalysis: OwnerAnalysis | undefined;
}

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
  search?: string;
  startDate?: Date;
  endDate?: Date;
  sortBy?: "date" | "duration";
  sortOrder?: "asc" | "desc";
}

function toRecordingResponse(recording: SelectRecording): Recording {
  return omit(recording, ["deletedAt", "metadata.model", "words"]) as Recording;
}

export const RecordingsService = {
  /**
   * Create a new recording, upload audio to S3, and trigger processing
   */
  create: async (input: CreateRecordingInput): Promise<Recording> => {
    const { organizationId, userId, audioBuffer } = input;

    const timestamp = Date.now();
    const path = `audio/${organizationId}/${userId}/raw-${timestamp}.wav`;
    const { url: rawAudioUrl } = await BlobStorageService.upload(
      path,
      audioBuffer,
      { contentType: "audio/wav" },
    );

    const recording = await insertRecording({
      organizationId,
      userId,
      status: "processing",
      rawAudioUrl,
    });

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
  ): Promise<Recording | undefined> => {
    const recording = await selectRecording(id, organizationId);

    if (!recording || recording.deletedAt) {
      return undefined;
    }

    return toRecordingResponse(recording);
  },

  /**
   * List recordings for an organization
   */
  list: async (
    input: ListRecordingsInput,
  ): Promise<{ recordings: Recording[]; count: number }> => {
    const {
      organizationId,
      userId,
      limit = 50,
      offset = 0,
      search,
      startDate,
      endDate,
      sortBy = "date",
      sortOrder = "desc",
    } = input;

    // Build order by clause
    const orderBy: Record<string, "asc" | "desc"> = {};
    if (sortBy === "duration") {
      orderBy.originalDuration = sortOrder;
    } else {
      orderBy.createdAt = sortOrder;
    }

    const { data, count } = await listRecordings(
      {
        organizationId,
        deletedAt: null,
        userId,
        search,
        startDate,
        endDate,
      },
      orderBy,
      limit,
      offset,
    );

    return {
      recordings: data.map(toRecordingResponse),
      count,
    };
  },

  /**
   * Soft delete a recording and its vectors
   */
  delete: async (
    id: string,
    organizationId: string,
  ): Promise<Recording | undefined> => {
    const recording = await updateRecording(
      {
        id,
        organizationId,
        deletedAt: null,
      },
      {
        deletedAt: new Date(),
      },
    );

    if (!recording?.[0]) {
      return undefined;
    }

    // Delete vectors associated with this recording
    await SimpleVectorService.deleteByFilter(RECORDINGS_INDEX, organizationId, {
      documentId: { $eq: id },
    });

    return toRecordingResponse(recording[0]);
  },
};
