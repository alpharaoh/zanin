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

    const transcription = await step.run("transcribe-audio", async () => {
      return await DeepgramService.transcribeUrl(cleanedAudioUrl);
    });

    return {
      success: true,
      transcription,
    };
  },
);
