import { useDeleteProfile, useEnroll, useGetProfile } from "@/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatDuration, formatRelativeDate } from "@/lib/format";
import { useQueryClient } from "@tanstack/react-query";
import {
  CheckIcon,
  Loader2Icon,
  MicIcon,
  PauseIcon,
  PlayIcon,
  RotateCcwIcon,
  SquareIcon,
  TrashIcon,
  UploadIcon,
} from "lucide-react";
import { useCallback, useRef, useState, useEffect } from "react";
import WaveSurfer from "wavesurfer.js";

// Convert audio blob to WAV format
async function convertToWav(blob: Blob): Promise<Blob> {
  const audioContext = new AudioContext();
  const arrayBuffer = await blob.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  // Create WAV file
  const numberOfChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const length = audioBuffer.length;

  // Interleave channels
  const interleaved = new Float32Array(length * numberOfChannels);
  for (let channel = 0; channel < numberOfChannels; channel++) {
    const channelData = audioBuffer.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      interleaved[i * numberOfChannels + channel] = channelData[i];
    }
  }

  // Convert to 16-bit PCM
  const pcmData = new Int16Array(interleaved.length);
  for (let i = 0; i < interleaved.length; i++) {
    const s = Math.max(-1, Math.min(1, interleaved[i]));
    pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }

  // Create WAV header
  const wavBuffer = new ArrayBuffer(44 + pcmData.length * 2);
  const view = new DataView(wavBuffer);

  // RIFF header
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + pcmData.length * 2, true);
  writeString(view, 8, "WAVE");

  // fmt chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numberOfChannels * 2, true); // byte rate
  view.setUint16(32, numberOfChannels * 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample

  // data chunk
  writeString(view, 36, "data");
  view.setUint32(40, pcmData.length * 2, true);

  // Write PCM data
  const pcmOffset = 44;
  for (let i = 0; i < pcmData.length; i++) {
    view.setInt16(pcmOffset + i * 2, pcmData[i], true);
  }

  await audioContext.close();
  return new Blob([wavBuffer], { type: "audio/wav" });
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

const RAINBOW_PASSAGE = `When the sunlight strikes raindrops in the air, they act like a prism and form a rainbow. The rainbow is a division of white light into many beautiful colors. These take the shape of a long round arch, with its path high above, and its two ends apparently beyond the horizon. There is, according to legend, a boiling pot of gold at one end. People look but no one ever finds it. When a man looks for something beyond his reach, his friends say he is looking for the pot of gold at the end of the rainbow.`;

interface VoiceProfileProps {
  className?: string;
}

type RecordingState = "idle" | "recording" | "recorded";

export function VoiceProfile({ className }: VoiceProfileProps) {
  const queryClient = useQueryClient();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEnrollDialog, setShowEnrollDialog] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Recording state
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // WaveSurfer state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isWaveformReady, setIsWaveformReady] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const waveformContainerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  const { data: profile, isLoading: isLoadingProfile } = useGetProfile();
  const enrollMutation = useEnroll();
  const deleteMutation = useDeleteProfile();

  // Initialize WaveSurfer when we have a recorded blob
  useEffect(() => {
    if (!recordedBlob || !waveformContainerRef.current || recordingState !== "recorded") {
      return;
    }

    // Clean up previous instance
    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
    }

    const blobUrl = URL.createObjectURL(recordedBlob);
    blobUrlRef.current = blobUrl;

    const wavesurfer = WaveSurfer.create({
      container: waveformContainerRef.current,
      waveColor: "#262626",
      progressColor: "#00d4ff",
      cursorColor: "#00d4ff",
      cursorWidth: 1,
      barWidth: 2,
      barGap: 2,
      barRadius: 0,
      height: 48,
      normalize: true,
    });

    wavesurfer.load(blobUrl);

    wavesurfer.on("ready", () => {
      setDuration(wavesurfer.getDuration());
      setIsWaveformReady(true);
      wavesurferRef.current = wavesurfer;
    });

    wavesurfer.on("timeupdate", (time) => {
      setCurrentTime(time);
    });

    wavesurfer.on("play", () => setIsPlaying(true));
    wavesurfer.on("pause", () => setIsPlaying(false));
    wavesurfer.on("finish", () => setIsPlaying(false));

    return () => {
      wavesurfer.destroy();
    };
  }, [recordedBlob, recordingState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
      }
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setPermissionError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        setRecordedBlob(audioBlob);
        setRecordingState("recorded");

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setRecordingState("recording");
      setRecordingDuration(0);

      // Start duration timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Failed to start recording:", error);
      setPermissionError(
        "Microphone access denied. Please allow microphone access to record."
      );
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }, []);

  const resetRecording = useCallback(() => {
    // Stop and destroy wavesurfer
    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
      wavesurferRef.current = null;
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }

    setRecordedBlob(null);
    setRecordingState("idle");
    setRecordingDuration(0);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setIsWaveformReady(false);
  }, []);

  const handlePlayPause = useCallback(() => {
    wavesurferRef.current?.playPause();
  }, []);

  const handleEnroll = useCallback(async () => {
    if (!recordedBlob) {
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      // Convert webm to WAV (server only accepts WAV, MP3, FLAC, OGG, M4A)
      const wavBlob = await convertToWav(recordedBlob);
      const file = new File([wavBlob], "voice-sample.wav", {
        type: "audio/wav",
      });

      await enrollMutation.mutateAsync({ data: { audio: file } });

      clearInterval(progressInterval);
      setUploadProgress(100);

      queryClient.invalidateQueries({ queryKey: ["/v1/sid/profile"] });
      setShowEnrollDialog(false);
      resetRecording();
    } catch (error) {
      console.error("Failed to enroll voice profile:", error);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [recordedBlob, enrollMutation, queryClient, resetRecording]);

  const handleDelete = useCallback(async () => {
    try {
      await deleteMutation.mutateAsync();
      queryClient.invalidateQueries({ queryKey: ["/v1/sid/profile"] });
      setShowDeleteDialog(false);
    } catch (error) {
      console.error("Failed to delete voice profile:", error);
    }
  }, [deleteMutation, queryClient]);

  const handleCloseEnrollDialog = useCallback(
    (open: boolean) => {
      if (!open) {
        resetRecording();
        setPermissionError(null);
      }
      setShowEnrollDialog(open);
    },
    [resetRecording]
  );

  const hasProfile = profile?.exists;

  return (
    <div className={cn("border border-border", className)}>
      {/* Header */}
      <div className="border-b border-border bg-card px-4 py-3">
        <p className="text-xs text-muted-foreground">{">"} voice_profile</p>
      </div>

      {/* Content */}
      <div className="p-4">
        {isLoadingProfile ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        ) : hasProfile ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex size-8 items-center justify-center border border-emerald-500/50 bg-emerald-500/10">
                <CheckIcon className="size-4 text-emerald-500" />
              </span>
              <div>
                <p className="text-sm">enrolled</p>
                {profile.created_at && (
                  <p className="text-xs text-muted-foreground">
                    {formatRelativeDate(profile.created_at)}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => setShowDeleteDialog(true)}
              disabled={deleteMutation.isPending}
              className="border border-border p-2 text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive"
            >
              {deleteMutation.isPending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <TrashIcon className="size-4" />
              )}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowEnrollDialog(true)}
            className="flex w-full items-center gap-3 border border-dashed border-border p-4 text-left transition-colors hover:border-primary/50"
          >
            <span className="flex size-8 items-center justify-center border border-border">
              <MicIcon className="size-4 text-muted-foreground" />
            </span>
            <div>
              <p className="text-sm">enroll voice profile</p>
              <p className="text-xs text-muted-foreground">
                record a sample to identify your voice
              </p>
            </div>
          </button>
        )}
      </div>

      {/* Enrollment Dialog */}
      <Dialog open={showEnrollDialog} onOpenChange={handleCloseEnrollDialog}>
        <DialogContent className="border border-border bg-background sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm">
              {">"} voice_enrollment
            </DialogTitle>
            <DialogDescription>
              Read the passage below clearly into your microphone. This helps us
              identify your voice in recordings.
            </DialogDescription>
          </DialogHeader>

          {/* Rainbow Passage */}
          <div className="border border-border bg-card p-4">
            <p className="text-xs leading-relaxed text-muted-foreground">
              {RAINBOW_PASSAGE}
            </p>
          </div>

          {/* Permission Error */}
          {permissionError && (
            <div className="border border-destructive/50 bg-destructive/10 p-3">
              <p className="text-xs text-destructive">{permissionError}</p>
            </div>
          )}

          {/* Recording Controls */}
          <div className="space-y-4">
            {/* Idle state - Record button */}
            {recordingState === "idle" && (
              <div className="flex flex-col items-center gap-4 py-4">
                <button
                  onClick={startRecording}
                  className="flex items-center gap-2 border border-primary bg-primary/10 px-6 py-3 text-sm text-primary transition-colors hover:bg-primary/20"
                >
                  <MicIcon className="size-5" />
                  Start Recording
                </button>
                <p className="text-xs text-muted-foreground">
                  Click to begin recording your voice
                </p>
              </div>
            )}

            {/* Recording state */}
            {recordingState === "recording" && (
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="flex items-center gap-3">
                  <span className="size-3 animate-pulse rounded-full bg-red-500" />
                  <span className="font-mono text-lg text-red-500">
                    {formatDuration(recordingDuration)}
                  </span>
                </div>
                <button
                  onClick={stopRecording}
                  className="flex items-center gap-2 border border-destructive bg-destructive/10 px-6 py-3 text-sm text-destructive transition-colors hover:bg-destructive/20"
                >
                  <SquareIcon className="size-5" />
                  Stop Recording
                </button>
              </div>
            )}

            {/* Recorded state - WaveSurfer player */}
            {recordingState === "recorded" && (
              <div className="border border-border bg-card">
                {/* Waveform */}
                <div
                  ref={waveformContainerRef}
                  className={cn("w-full p-4", !isWaveformReady && "animate-pulse")}
                />

                {/* Controls */}
                <div className="flex items-center justify-between border-t border-border px-4 py-3">
                  <div className="flex items-center gap-2">
                    {/* Play/Pause */}
                    <button
                      onClick={handlePlayPause}
                      disabled={!isWaveformReady}
                      className="border border-primary bg-primary p-2 text-primary-foreground transition-opacity hover:opacity-80 disabled:opacity-30"
                    >
                      {isPlaying ? (
                        <PauseIcon className="size-4" />
                      ) : (
                        <PlayIcon className="size-4" />
                      )}
                    </button>

                    {/* Time */}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {formatDuration(currentTime)}
                      <span className="mx-1 text-border">/</span>
                      {formatDuration(duration)}
                    </span>
                  </div>

                  {/* Restart */}
                  <button
                    onClick={resetRecording}
                    className="flex items-center gap-1.5 border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
                  >
                    <RotateCcwIcon className="size-3.5" />
                    Restart
                  </button>
                </div>
              </div>
            )}

            {/* Upload Progress */}
            {isUploading && (
              <div className="space-y-2">
                <Progress value={uploadProgress} className="h-1" />
                <p className="text-center text-xs text-muted-foreground">
                  uploading...
                </p>
              </div>
            )}

            {/* Submit Button */}
            {recordingState === "recorded" && !isUploading && (
              <button
                onClick={handleEnroll}
                disabled={recordingDuration < 10}
                className={cn(
                  "flex w-full items-center justify-center gap-2 border px-4 py-3 text-xs transition-colors",
                  recordingDuration >= 10
                    ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
                    : "border-border bg-muted text-muted-foreground"
                )}
              >
                <UploadIcon className="size-4" />
                {recordingDuration < 10
                  ? `Record at least ${10 - recordingDuration} more seconds`
                  : "Save Voice Profile"}
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="border border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">
              {">"} confirm_delete
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              remove voice profile? this will affect speaker identification in
              future recordings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border border-border bg-transparent text-xs hover:bg-card">
              cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="border border-destructive bg-destructive/10 text-xs text-destructive hover:bg-destructive hover:text-white"
            >
              {deleteMutation.isPending && (
                <Loader2Icon className="size-3 animate-spin" />
              )}
              remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
