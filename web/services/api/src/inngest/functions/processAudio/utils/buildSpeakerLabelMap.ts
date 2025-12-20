/**
 * Build a map from speaker number to identity label.
 * Owner becomes "ME", others become "SPEAKER 1", "SPEAKER 2", etc.
 */
export function buildSpeakerLabelMap(
  identifiedSegments: Array<{ speaker: number; identity: "owner" | "other" }>,
): Map<number, string> {
  const labelMap = new Map<number, string>();
  let otherSpeakerCount = 0;

  // Get unique speakers
  const uniqueSpeakers = new Set(identifiedSegments.map((s) => s.speaker));

  for (const speaker of uniqueSpeakers) {
    const segment = identifiedSegments.find((s) => s.speaker === speaker);
    if (segment?.identity === "owner") {
      labelMap.set(speaker, "ME");
    } else {
      otherSpeakerCount++;
      labelMap.set(speaker, `SPEAKER ${otherSpeakerCount}`);
    }
  }

  return labelMap;
}
