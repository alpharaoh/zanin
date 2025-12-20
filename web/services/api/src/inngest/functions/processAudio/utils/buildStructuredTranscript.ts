/**
 * A single turn in the transcript (one speaker's continuous speech)
 */
export interface TranscriptTurn {
  /** Speaker label (e.g., "ME", "SPEAKER 1") */
  speaker: string;
  /** Original speaker number from diarization */
  speakerNumber: number;
  content: string;
  start: number;
  end: number;
  wordCount: number;
}

interface TranscriptWord {
  word: string;
  start: number;
  end: number;
  speaker?: number;
  confidence?: number;
  punctuated_word?: string;
}

/**
 * Build a structured transcript from Deepgram words.
 * Groups consecutive words by speaker into turns with timing info.
 *
 * @param words - Array of words from Deepgram transcription
 * @param speakerLabelMap - Optional map from speaker number to label (e.g., 0 -> "ME")
 * @returns Array of transcript turns
 */
export function buildStructuredTranscript(
  words: TranscriptWord[],
  speakerLabelMap?: Map<number, string>,
): TranscriptTurn[] {
  if (words.length === 0) {
    return [];
  }

  const turns: TranscriptTurn[] = [];
  let currentSpeaker = words[0].speaker ?? 0;
  let currentWords: string[] = [];
  let turnStart = words[0].start;
  let turnEnd = words[0].end;

  // Helper to get speaker label
  const getSpeakerLabel = (speakerNum: number): string => {
    return speakerLabelMap?.get(speakerNum) ?? `SPEAKER ${speakerNum}`;
  };

  // Helper to finalize current turn
  const finalizeTurn = () => {
    if (currentWords.length > 0) {
      turns.push({
        speaker: getSpeakerLabel(currentSpeaker),
        content: currentWords.join(" "),
        start: turnStart,
        end: turnEnd,
        speakerNumber: currentSpeaker,
        wordCount: currentWords.length,
      });
    }
  };

  // Add first word
  currentWords.push(words[0].punctuated_word ?? words[0].word);

  // Process remaining words
  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const speaker = word.speaker ?? 0;

    if (speaker !== currentSpeaker) {
      // Speaker changed - finalize current turn
      finalizeTurn();

      // Start new turn
      currentSpeaker = speaker;
      currentWords = [];
      turnStart = word.start;
    }

    currentWords.push(word.punctuated_word ?? word.word);
    turnEnd = word.end;
  }

  // Don't forget the last turn
  finalizeTurn();

  return turns;
}

/**
 * Convert structured transcript to a readable text format.
 * Each turn is on its own line with speaker label prefix.
 *
 * @param transcript - Array of transcript turns
 * @returns Formatted text transcript
 */
export function transcriptToText(transcript: TranscriptTurn[]): string {
  return transcript
    .map((turn) => `[${turn.speaker}]: ${turn.content}`)
    .join("\n\n");
}
