import { inngest } from "../../client";
import VADService from "../../../services/external/vad/service";
import DeepgramService from "../../../services/external/deepgram/service";
import BlobStorageService from "../../../services/external/store/blob/service";
import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

type ProcessAudio = {
  data: {
    audioUrl: string;
  };
};

export type ProcessAudioEvent = {
  "audio/process.audio": ProcessAudio;
};

export default inngest.createFunction(
  { id: "process-audio" },
  { event: "audio/process.audio" },
  async ({ step }) => {
    // Step 1: Fetch audio and upload to blob storage
    const rawAudioUrl = await step.run("fetch-audio", async () => {
      // TEST: Read from local file instead of URL
      const testFilePath = join(homedir(), "Downloads", "test.wav");
      const buffer = readFileSync(testFilePath);

      const { url } = await BlobStorageService.upload(
        `audio/raw-${Date.now()}.wav`,
        buffer,
        { contentType: "audio/wav" },
      );

      return url;
    });

    // Step 2: Process with VAD and upload cleaned audio
    const cleanedAudioUrl = await step.run("process-vad", async () => {
      const buffer = await BlobStorageService.download(rawAudioUrl);
      const cleanedBuffer = await VADService.processAudio(buffer);

      const { url } = await BlobStorageService.upload(
        `audio/cleaned-${Date.now()}.wav`,
        cleanedBuffer,
        { contentType: "audio/wav" },
      );

      return url;
    });

    // Step 3: Transcribe with Deepgram
    const transcription = await step.run("transcribe-audio", async () => {
      const buffer = await BlobStorageService.download(cleanedAudioUrl);
      return await DeepgramService.transcribe(buffer);
    });

    return {
      success: true,
      transcription,
    };
  },
);
