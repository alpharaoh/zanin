import { inngest } from "../../client";
import VADService from "../../../services/external/vad/service";
import DeepgramService from "../../../services/external/deepgram/service";
import BlobStorageService from "../../../services/external/store/blob/service";
import { SimpleLLMService } from "../../../services/external/llm/service";
import { insertRecording } from "@zanin/db/queries/insert/insertRecording";
import { updateRecording } from "@zanin/db/queries/update/updateRecording";
import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

// TODO: Remove hardcoded values when auth is integrated
const TEMP_ORG_ID = "019b3473-1477-714e-8bd9-0b87826bd3b6";
const TEMP_USER_ID = "d7Kn0Gy1jySEQF3jgWna86cKecFpAANl";

type ProcessAudio = {
  data: {
    audioUrl: string;
  };
};

export type ProcessAudioEvent = {
  "audio/process.audio": ProcessAudio;
};

export default inngest.createFunction(
  {
    id: "process-audio",
    concurrency: 10,
  },
  { event: "audio/process.audio" },
  async ({ step }) => {
    // Create initial recording entry
    const recording = await step.run("create-recording", async () => {
      return await insertRecording({
        organizationId: TEMP_ORG_ID,
        userId: TEMP_USER_ID,
        status: "processing",
        rawAudioUrl: "", // Will be updated after upload
      });
    });

    // TEST: Read from local file instead of URL
    const rawAudioUrl = await step.run("fetch-audio", async () => {
      const testFilePath = join(homedir(), "Downloads", "test.wav");
      const buffer = readFileSync(testFilePath);

      const { url } = await BlobStorageService.upload(
        `audio/raw-${Date.now()}.wav`,
        buffer,
        { contentType: "audio/wav" },
      );

      return url;
    });

    await step.run("update-raw-recording-url", async () => {
      await updateRecording({ id: recording.id }, { rawAudioUrl });
    });

    const { url: cleanedAudioUrl, segments: vadSegments } = await step.run(
      "process-vad",
      async () => {
        const buffer = await BlobStorageService.download(rawAudioUrl);

        const [cleanedBuffer, segments] = await Promise.all([
          VADService.processAudio(buffer),
          VADService.detectSegments(buffer),
        ]);

        const { url } = await BlobStorageService.upload(
          `audio/cleaned-${Date.now()}.wav`,
          cleanedBuffer,
          { contentType: "audio/wav" },
        );

        return { url, segments };
      },
    );

    await step.run("update-cleaned-recording-url", async () => {
      await updateRecording(
        { id: recording.id },
        { cleanedAudioUrl, vadSegments },
      );
    });

    const transcription = await step.run("transcribe-audio", async () => {
      const result = await DeepgramService.transcribeUrl(cleanedAudioUrl);
      return result;
    });

    const title = await step.run("generate-title", async () => {
      return await SimpleLLMService.generateText(
        `Summarize the following transcript into a title:\n\n"${transcription.transcript}"\n\nThe title must be no longer than 5 words.`,
      );
    });

    await step.run("update-recording", async () => {
      await updateRecording(
        { id: recording.id },
        {
          status: "completed",
          finishedAt: new Date(),
          cleanedTranscript: transcription.transcript,
          confidence: transcription.confidence,
          words: transcription.words,
          title: title.trim(),
          metadata: {
            model: "nova-2",
            language: "en",
          },
        },
      );
    });

    // Trigger vectorization of the recording
    await step.sendEvent("trigger-vectorization", {
      name: "recording/vectorize",
      data: {
        recordingId: recording.id,
      },
    });

    return {
      success: true,
      recordingId: recording.id,
      transcription,
    };
  },
);
