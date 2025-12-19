import { inngest } from "../../client";
import { selectRecording } from "@zanin/db/queries/select/selectRecording";
import { updateRecording } from "@zanin/db/queries/update/updateRecording";
import VectorDBService from "../../../services/external/store/vector/service";
import { NonRetriableError } from "inngest";

type VectorizeRecording = {
  data: {
    recordingId: string;
  };
};

export type VectorizeRecordingEvent = {
  "recording/vectorize": VectorizeRecording;
};

export default inngest.createFunction(
  {
    id: "vectorize-recording",
    concurrency: 5,
    retries: 3,
  },
  { event: "recording/vectorize" },
  async ({ event, step }) => {
    const { recordingId } = event.data;

    // Fetch the recording
    const recording = await step.run("fetch-recording", async () => {
      const rec = await selectRecording(recordingId);

      if (!rec) {
        throw new NonRetriableError(`Recording not found: ${recordingId}`);
      }

      if (!rec.cleanedTranscript) {
        throw new NonRetriableError(
          `Recording has no transcript: ${recordingId}`,
        );
      }

      return rec;
    });

    const vectorResult = await step.run("vectorize-transcript", async () => {
      return await VectorDBService.upsertRecording({
        recordingId: recording.id,
        organizationId: recording.organizationId,
        userId: recording.userId,
        transcript: recording.cleanedTranscript!,
      });
    });

    // Update recording metadata with vectorization info
    await step.run("update-recording-metadata", async () => {
      const existingMetadata =
        (recording.metadata as Record<string, unknown>) || {};

      await updateRecording(
        { id: recording.id },
        {
          metadata: {
            ...existingMetadata,
            vectorized: true,
            vectorizedAt: new Date().toISOString(),
            chunksCount: vectorResult.chunksUpserted,
          },
        },
      );
    });

    return {
      success: true,
      recordingId,
      chunksUpserted: vectorResult.chunksUpserted,
      vectorIds: vectorResult.vectorIds,
    };
  },
);
