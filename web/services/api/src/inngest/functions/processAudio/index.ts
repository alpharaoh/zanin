import { inngest } from "../../client";
import { vectorize } from "../vectorize";
import VADService from "../../../services/external/vad/service";
import DeepgramService from "../../../services/external/deepgram/service";
import BlobStorageService from "../../../services/external/store/blob/service";
import { SimpleLLMService } from "../../../services/external/llm/simple";
import SIDService from "../../../services/external/sid/service";
import { updateRecording } from "@zanin/db/queries/update/updateRecording";
import { extractSpeakerSegments } from "./utils/extractSpeakerSegments";
import { buildSpeakerLabelMap } from "./utils/buildSpeakerLabelMap";
import {
  buildStructuredTranscript,
  transcriptToText,
} from "./utils/buildStructuredTranscript";

const RECORDINGS_INDEX = "recordings";

interface ProcessAudioData {
  recordingId: string;
  organizationId: string;
  userId: string;
  audioUrl: string;
}

type ProcessAudio = {
  data: ProcessAudioData;
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
  async ({ event, step, logger }) => {
    const { recordingId, organizationId, userId, audioUrl } = event.data;

    logger.info("Processing audio", { recordingId, organizationId, userId });

    // Process VAD to clean audio and detect speech segments
    const { url: cleanedAudioUrl, segments: vadSegments } = await step.run(
      "process-vad",
      async () => {
        const buffer = await BlobStorageService.download(audioUrl);

        const [cleanedBuffer, segments] = await Promise.all([
          VADService.processAudio(buffer),
          VADService.detectSegments(buffer),
        ]);

        const { url } = await BlobStorageService.upload(
          `audio/${organizationId}/${userId}/cleaned-${Date.now()}.wav`,
          cleanedBuffer,
          { contentType: "audio/wav" },
        );

        return { url, segments };
      },
    );

    logger.info("Generated VAD segments", { recordingId });

    await step.run("update-vad-results", async () => {
      await updateRecording(
        { id: recordingId },
        { cleanedAudioUrl, vadSegments },
      );
    });

    // Transcribe with Deepgram
    const transcription = await step.run("transcribe-audio", async () => {
      const result = await DeepgramService.transcribeUrl(cleanedAudioUrl);
      return result;
    });

    logger.info("Generated transcription", { recordingId });

    // Identify speakers using voice recognition
    const speakerIdentification = await step.run(
      "identify-speakers",
      async () => {
        const hasProfile = await SIDService.hasProfile(userId);
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
          userId,
          segments,
          cleanedAudioUrl,
        );

        return result;
      },
    );

    logger.info("Identified speakers", { recordingId });

    // Build speaker label map and structured transcript
    const speakerLabelMap = speakerIdentification
      ? buildSpeakerLabelMap(speakerIdentification.segments)
      : undefined;

    const transcript = buildStructuredTranscript(
      transcription.words,
      speakerLabelMap,
    );

    const transcriptText = transcriptToText(transcript);

    // Generate title from transcript
    const title = await step.run("generate-title", async () => {
      return await SimpleLLMService.generateText(
        `Summarize the following transcript into a title:\n\n"${transcriptText}"\n\nThe title must be no longer than 5 words.`,
      );
    });

    logger.info("Generated title", { recordingId, title });

    // Update recording with all results
    await step.run("update-recording", async () => {
      await updateRecording(
        { id: recordingId },
        {
          status: "completed",
          finishedAt: new Date(),
          transcript,
          originalDuration: vadSegments.total_audio_duration,
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

    logger.info("Updated recording metadata", { recordingId });

    // Vectorize the recording transcript
    const vectorResult = await step.invoke("vectorize-recording", {
      function: vectorize,
      data: {
        indexName: RECORDINGS_INDEX,
        namespace: organizationId,
        documentId: recordingId,
        text: transcriptText,
        metadata: {
          recordingId,
          organizationId,
          userId,
        },
        options: {
          useContextualEmbeddings: false,
        },
      },
    });

    logger.info("Vectorized recording", { recordingId });

    return {
      success: true,
      recordingId,
      transcription,
      vectorization: vectorResult,
    };
  },
);
