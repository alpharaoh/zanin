import { inngest } from "../../client";
import VADService from "../../../services/external/vad/service";
import DeepgramService from "../../../services/external/deepgram/service";
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
    const audioBuffer = await step.run("fetch-audio", async () => {
      const testFilePath = join(homedir(), "Downloads", "test.wav");
      const buffer = readFileSync(testFilePath);
      return buffer.toString("base64");
    });

    const cleanedAudioBase64 = await step.run("process-vad", async () => {
      const buffer = Buffer.from(audioBuffer, "base64");
      const cleanedBuffer = await VADService.processAudio(buffer);
      return cleanedBuffer.toString("base64");
    });

    const transcription = await step.run("transcribe-audio", async () => {
      const buffer = Buffer.from(cleanedAudioBase64, "base64");
      return await DeepgramService.transcribe(buffer);
    });

    return {
      success: true,
      transcription,
    };
  },
);
