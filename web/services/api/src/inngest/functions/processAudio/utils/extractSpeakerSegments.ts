import { SIDSegment } from "../../../../services/external/sid/service";

/**
 * Extract speaker segments from Deepgram words.
 * Groups consecutive words by speaker into segments with start/end times.
 */
export function extractSpeakerSegments(
  words: Array<{ speaker?: number; start: number; end: number; word: string }>,
): SIDSegment[] {
  if (words.length === 0) {
    return [];
  }

  const segments: SIDSegment[] = [];
  let currentSpeaker = words[0].speaker ?? 0;
  let segmentStart = words[0].start;
  let segmentEnd = words[0].end;

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const speaker = word.speaker ?? 0;

    if (speaker !== currentSpeaker) {
      // Save current segment
      segments.push({
        speaker: currentSpeaker,
        start: segmentStart,
        end: segmentEnd,
      });

      // Start new segment
      currentSpeaker = speaker;
      segmentStart = word.start;
    }

    segmentEnd = word.end;
  }

  // Don't forget the last segment
  segments.push({
    speaker: currentSpeaker,
    start: segmentStart,
    end: segmentEnd,
  });

  return segments;
}
