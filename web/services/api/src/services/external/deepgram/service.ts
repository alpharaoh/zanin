import { deepgramClient } from "./client";

interface Word {
  word: string;
  start: number;
  end: number;
  confidence: number;
}

interface TranscriptionResult {
  transcript: string;
  confidence: number;
  words: Word[];
}

interface TranscribeOptions {
  model?: "nova-2" | "nova" | "enhanced" | "base";
  language?: string;
  punctuate?: boolean;
  smartFormat?: boolean;
}

const DEFAULT_OPTIONS: TranscribeOptions = {
  model: "nova-2",
  language: "en",
  punctuate: true,
  smartFormat: true,
};

const DeepgramService = {
  transcribe: async (
    audioBuffer: Buffer,
    options: TranscribeOptions = {},
  ): Promise<TranscriptionResult> => {
    const config = { ...DEFAULT_OPTIONS, ...options };

    const { result, error } =
      await deepgramClient.listen.prerecorded.transcribeFile(audioBuffer, {
        model: config.model,
        smart_format: config.smartFormat,
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
    options: TranscribeOptions = {},
  ): Promise<TranscriptionResult> => {
    const config = { ...DEFAULT_OPTIONS, ...options };

    const { result, error } =
      await deepgramClient.listen.prerecorded.transcribeUrl(
        { url },
        {
          model: config.model,
          smart_format: config.smartFormat,
          punctuate: config.punctuate,
          language: config.language,
        },
      );

    if (error) {
      throw new Error(`Deepgram transcription failed: ${error.message}`);
    }

    return parseTranscriptionResult(result);
  },
};

function parseTranscriptionResult(result: any): TranscriptionResult {
  const channel = result.results?.channels?.[0];
  const alternative = channel?.alternatives?.[0];

  if (!alternative) {
    throw new Error("No transcription result returned from Deepgram");
  }

  return {
    transcript: alternative.transcript || "",
    confidence: alternative.confidence || 0,
    words:
      alternative.words?.map((w: any) => ({
        word: w.word,
        start: w.start,
        end: w.end,
        confidence: w.confidence,
      })) || [],
  };
}

export default DeepgramService;
