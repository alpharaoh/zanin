import { inngest } from "../../client";
import { vectorize } from "../vectorize";
import VADService from "../../../services/external/vad/service";
import DeepgramService from "../../../services/external/deepgram/service";
import BlobStorageService from "../../../services/external/store/blob/service";
import { SimpleLLMService } from "../../../services/external/llm/simple";
import SIDService from "../../../services/external/sid/service";
import { insertRecording } from "@zanin/db/queries/insert/insertRecording";
import { updateRecording } from "@zanin/db/queries/update/updateRecording";
import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { extractSpeakerSegments } from "./utils/extractSpeakerSegments";
import { buildSpeakerLabelMap } from "./utils/buildSpeakerLabelMap";

const RECORDINGS_INDEX = "recordings";

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
  async ({ step, logger }) => {
    logger.info("Processing audio");

    // Create initial recording entry
    const recording = await step.run("create-recording", async () => {
      return await insertRecording({
        organizationId: TEMP_ORG_ID,
        userId: TEMP_USER_ID,
        status: "processing",
        rawAudioUrl: "", // Will be updated after upload
      });
    });

    logger.info("Created recording", { recordingId: recording.id });

    // TEST: Read from local file instead of URL
    const rawAudioUrl = await step.run("fetch-audio", async () => {
      const testFilePath = join(homedir(), "Downloads", "conversation.wav");
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

    logger.info("Updated raw recording URL", { recordingId: recording.id });

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

    logger.info("Generated VAD segments", { recordingId: recording.id });

    await step.run("update-cleaned-recording-url", async () => {
      await updateRecording(
        { id: recording.id },
        { cleanedAudioUrl, vadSegments },
      );
    });

    logger.info("Updated VAD segments and cleanedAudioUrl", {
      recordingId: recording.id,
    });

    const transcription = await step.run("transcribe-audio", async () => {
      const result = await DeepgramService.transcribeUrl(cleanedAudioUrl);
      return result;
    });

    logger.info("Generated transcription", { recordingId: recording.id });

    // Identify speakers using voice recognition
    const speakerIdentification = await step.run(
      "identify-speakers",
      async () => {
        const hasProfile = await SIDService.hasProfile(TEMP_USER_ID);
        if (!hasProfile) {
          logger.info(
            "No voice profile found, skipping speaker identification",
          );
          return undefined;
        }

        const segments = extractSpeakerSegments(transcription.words);
        if (segments.length === 0) {
          return undefined;
        }

        const result = await SIDService.identifyFromUrl(
          TEMP_USER_ID,
          segments,
          cleanedAudioUrl,
        );

        return result;
      },
    );

    logger.info("Identified speakers", { recordingId: recording.id });

    // Build speaker label map and create transcript
    const speakerLabelMap = speakerIdentification
      ? buildSpeakerLabelMap(speakerIdentification.segments)
      : undefined;

    const cleanedTranscript = transcription.words
      .map((word) => {
        const speakerNum = word.speaker ?? 0;
        const label =
          speakerLabelMap?.get(speakerNum) ?? `SPEAKER ${speakerNum}`;
        return `[${label}]: ${word.word}`;
      })
      .join("\n");

    const title = await step.run("generate-title", async () => {
      return await SimpleLLMService.generateText(
        `Summarize the following transcript into a title:\n\n"${cleanedTranscript}"\n\nThe title must be no longer than 5 words.`,
      );
    });

    logger.info(`Generated title: ${title}`, { recordingId: recording.id });

    await step.run("update-recording", async () => {
      await updateRecording(
        { id: recording.id },
        {
          status: "completed",
          finishedAt: new Date(),
          cleanedTranscript: cleanedTranscript,
          confidence: transcription.confidence,
          words: transcription.words,
          title: title.trim(),
          speakerLabels: speakerLabelMap
            ? Object.fromEntries(speakerLabelMap)
            : undefined,
          metadata: {
            model: "nova-2",
            language: "en",
            speakerIdentification: speakerIdentification
              ? {
                  ownerSpeakingSeconds:
                    speakerIdentification.owner_speaking_seconds,
                  otherSpeakingSeconds:
                    speakerIdentification.other_speaking_seconds,
                }
              : undefined,
          },
        },
      );
    });

    logger.info("Updated recording metadata", { recordingId: recording.id });

    // Vectorize the recording transcript
    const vectorResult = await step.invoke("vectorize-recording", {
      function: vectorize,
      data: {
        indexName: RECORDINGS_INDEX,
        namespace: TEMP_ORG_ID,
        documentId: recording.id,
        text: cleanedTranscript,
        metadata: {
          recordingId: recording.id,
          organizationId: TEMP_ORG_ID,
          userId: TEMP_USER_ID,
        },
        options: {
          useContextualEmbeddings: false,
        },
      },
    });

    logger.info("Vectorized recording", { recordingId: recording.id });

    return {
      success: true,
      recordingId: recording.id,
      transcription,
      vectorization: vectorResult,
    };
  },
);
