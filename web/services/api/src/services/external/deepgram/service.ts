import type { SyncPrerecordedResponse, PrerecordedSchema } from "@deepgram/sdk";
import { deepgramClient } from "./client";

type Alternative =
  SyncPrerecordedResponse["results"]["channels"][0]["alternatives"][0];

const DEFAULT_OPTIONS: Partial<PrerecordedSchema> = {
  model: "nova-2",
  language: "en",
  punctuate: true,
  diarize: true,
};

const DeepgramService = {
  transcribe: async (
    audioBuffer: Buffer,
    options: Partial<PrerecordedSchema> = {},
  ): Promise<Alternative> => {
    const config = { ...DEFAULT_OPTIONS, ...options };

    const { result, error } =
      await deepgramClient.listen.prerecorded.transcribeFile(audioBuffer, {
        model: config.model,
        punctuate: config.punctuate,
        language: config.language,
      });

    if (error) {
      throw new Error(`Deepgram transcription failed: ${error.message}`);
    }

    return parseTranscriptionResult(result);
  },

  transcribeUrl: async (
    url: string,
    options: Partial<PrerecordedSchema> = {},
  ): Promise<Alternative> => {
    const config = { ...DEFAULT_OPTIONS, ...options };

    const { result, error } =
      await deepgramClient.listen.prerecorded.transcribeUrl(
        { url },
        {
          model: config.model,
          punctuate: config.punctuate,
          diarize: config.diarize,
          language: config.language,
        },
      );

    if (error) {
      throw new Error(`Deepgram transcription failed: ${error.message}`);
    }

    return parseTranscriptionResult(result);
  },
};

function parseTranscriptionResult(
  result: SyncPrerecordedResponse,
): Alternative {
  const channel = result.results?.channels?.[0];
  const alternative = channel?.alternatives?.[0];

  if (!alternative) {
    throw new Error("No transcription result returned from Deepgram");
  }

  return alternative;
}

export default DeepgramService;
