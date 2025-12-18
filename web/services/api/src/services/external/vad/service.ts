import { env } from "@zanin/env/server";

interface VADSegment {
  start: number;
  end: number;
  confidence: number;
}

interface VADDetectionResult {
  segments: VADSegment[];
  total_speech_duration: number;
  total_audio_duration: number;
}

const VADService = {
  processAudio: async (
    audioBuffer: Buffer,
    filename: string = "audio.wav",
  ): Promise<Buffer> => {
    const formData = new FormData();
    const blob = new Blob([audioBuffer as BlobPart], { type: "audio/wav" });
    formData.append("file", blob, filename);

    const response = await fetch(
      `${env.VAD_SERVICE_URL}/api/v1/vad/detect/audio`,
      {
        method: "POST",
        body: formData,
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `VAD processing failed: ${response.status} - ${errorText}`,
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  },

  detectSegments: async (
    audioBuffer: Buffer,
    filename: string = "audio.wav",
  ): Promise<VADDetectionResult> => {
    const formData = new FormData();
    const blob = new Blob([audioBuffer as BlobPart], { type: "audio/wav" });
    formData.append("file", blob, filename);

    const response = await fetch(`${env.VAD_SERVICE_URL}/api/v1/vad/detect`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `VAD detection failed: ${response.status} - ${errorText}`,
      );
    }

    return await response.json();
  },
};

export default VADService;
