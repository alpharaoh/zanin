import { env } from "@zanin/env/server";

/**
 * Segment input for speaker identification
 */
export interface SIDSegment {
  speaker: number;
  start: number;
  end: number;
}

/**
 * Identified segment with speaker identity
 */
export interface IdentifiedSegment {
  speaker: number;
  start: number;
  end: number;
  identity: "owner" | "other";
  confidence: number;
}

/**
 * Response from the identify endpoint
 */
export interface IdentifyResponse {
  success: boolean;
  segments: IdentifiedSegment[];
  owner_speaking_seconds: number;
  other_speaking_seconds: number;
}

/**
 * Response from the enroll endpoint
 */
export interface EnrollResponse {
  success: boolean;
  user_id: string;
  audio_duration_seconds: number;
  embedding_dimension: number;
  message?: string;
}

/**
 * Profile information
 */
export interface ProfileInfo {
  exists: boolean;
  user_id: string;
  embedding_dimension?: number;
  created_at?: string;
}

const SIDService = {
  /**
   * Enroll a user's voice profile
   */
  enroll: async (
    userId: string,
    audioBuffer: Buffer,
    filename: string = "audio.wav",
  ): Promise<EnrollResponse> => {
    const formData = new FormData();
    const blob = new Blob([audioBuffer as BlobPart], { type: "audio/wav" });
    formData.append("user_id", userId);
    formData.append("audio", blob, filename);

    const response = await fetch(
      `${env.SID_SERVICE_URL}/api/v1/sid/enroll`,
      {
        method: "POST",
        body: formData,
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `SID enrollment failed: ${response.status} - ${errorText}`,
      );
    }

    return await response.json();
  },

  /**
   * Identify speakers in audio segments
   */
  identify: async (
    userId: string,
    segments: SIDSegment[],
    audioBuffer: Buffer,
    filename: string = "audio.wav",
  ): Promise<IdentifyResponse> => {
    const formData = new FormData();
    const blob = new Blob([audioBuffer as BlobPart], { type: "audio/wav" });
    formData.append("user_id", userId);
    formData.append("segments", JSON.stringify(segments));
    formData.append("audio", blob, filename);

    const response = await fetch(
      `${env.SID_SERVICE_URL}/api/v1/sid/identify`,
      {
        method: "POST",
        body: formData,
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `SID identification failed: ${response.status} - ${errorText}`,
      );
    }

    return await response.json();
  },

  /**
   * Identify speakers using an audio URL (downloads the audio first)
   */
  identifyFromUrl: async (
    userId: string,
    segments: SIDSegment[],
    audioUrl: string,
  ): Promise<IdentifyResponse> => {
    // Download the audio
    const response = await fetch(audioUrl);
    if (!response.ok) {
      throw new Error(`Failed to download audio: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract filename from URL or use default
    const urlPath = new URL(audioUrl).pathname;
    const filename = urlPath.split("/").pop() || "audio.wav";

    return SIDService.identify(userId, segments, buffer, filename);
  },

  /**
   * Check if a user has an enrolled voice profile
   */
  getProfile: async (userId: string): Promise<ProfileInfo> => {
    const response = await fetch(
      `${env.SID_SERVICE_URL}/api/v1/sid/profiles/${userId}`,
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `SID profile check failed: ${response.status} - ${errorText}`,
      );
    }

    return await response.json();
  },

  /**
   * Check if a user has an enrolled voice profile
   */
  hasProfile: async (userId: string): Promise<boolean> => {
    const profile = await SIDService.getProfile(userId);
    return profile.exists;
  },

  /**
   * Delete a user's voice profile
   */
  deleteProfile: async (userId: string): Promise<void> => {
    const response = await fetch(
      `${env.SID_SERVICE_URL}/api/v1/sid/profiles/${userId}`,
      { method: "DELETE" },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `SID profile deletion failed: ${response.status} - ${errorText}`,
      );
    }
  },
};

export default SIDService;
