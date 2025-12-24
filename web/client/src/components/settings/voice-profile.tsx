import { useDeleteProfile, useEnroll, useGetProfile } from "@/api";
import { toast } from "sonner";
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

  const numberOfChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const length = audioBuffer.length;

  const interleaved = new Float32Array(length * numberOfChannels);
  for (let channel = 0; channel < numberOfChannels; channel++) {
    const channelData = audioBuffer.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      interleaved[i * numberOfChannels + channel] = channelData[i];
    }
  }

  const pcmData = new Int16Array(interleaved.length);
  for (let i = 0; i < interleaved.length; i++) {
    const s = Math.max(-1, Math.min(1, interleaved[i]));
    pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }

  const wavBuffer = new ArrayBuffer(44 + pcmData.length * 2);
  const view = new DataView(wavBuffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + pcmData.length * 2, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numberOfChannels * 2, true);
  view.setUint16(32, numberOfChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, pcmData.length * 2, true);

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

// Animated sound wave bars component
function SoundWaveBars({ isAnimating }: { isAnimating: boolean }) {
  return (
    <div className="flex items-center justify-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className={cn(
            "w-0.5 bg-primary transition-all duration-150",
            isAnimating ? "animate-sound-wave" : "h-1"
          )}
          style={{
            animationDelay: isAnimating ? `${i * 0.1}s` : undefined,
            height: isAnimating ? undefined : "4px",
          }}
        />
      ))}
      <style>{`
        @keyframes sound-wave {
          0%, 100% { height: 4px; }
          50% { height: 16px; }
        }
        .animate-sound-wave {
          animation: sound-wave 0.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

// Pulsing ring animation for recording
function PulseRings() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className="absolute size-full rounded-full border border-red-500/30"
          style={{
            animation: `pulse-ring 2s ease-out infinite`,
            animationDelay: `${i * 0.4}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes pulse-ring {
          0% {
            transform: scale(1);
            opacity: 0.6;
          }
          100% {
            transform: scale(2.5);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

// Scanline overlay effect
function ScanlineOverlay() {
  return (
    <div
      className="pointer-events-none absolute inset-0 opacity-[0.03]"
      style={{
        backgroundImage: `repeating-linear-gradient(
          0deg,
          transparent,
          transparent 1px,
          rgba(0, 212, 255, 0.1) 1px,
          rgba(0, 212, 255, 0.1) 2px
        )`,
        backgroundSize: "100% 2px",
      }}
    />
  );
}

export function VoiceProfile({ className }: VoiceProfileProps) {
  const queryClient = useQueryClient();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEnrollDialog, setShowEnrollDialog] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);

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

  useEffect(() => {
    if (
      !recordedBlob ||
      !waveformContainerRef.current ||
      recordingState !== "recorded"
    ) {
      return;
    }

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
      waveColor: "#404040",
      progressColor: "#00d4ff",
      cursorColor: "#00d4ff",
      cursorWidth: 2,
      barWidth: 2,
      barGap: 2,
      barRadius: 0,
      height: 64,
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
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setRecordingState("recording");
      setRecordingDuration(0);

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
      toast.success("Voice profile enrolled");
    } catch (error) {
      console.error("Failed to enroll voice profile:", error);
      toast.error("Failed to enroll voice profile");
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
      toast.success("Voice profile removed");
    } catch (error) {
      console.error("Failed to delete voice profile:", error);
      toast.error("Failed to remove voice profile");
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
    <div
      className={cn(
        "group relative overflow-hidden border border-border bg-gradient-to-b from-card to-background",
        className
      )}
    >
      {/* Subtle grid pattern overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-30 grid-pattern" />

      {/* Header */}
      <div className="relative border-b border-border bg-card/80 px-4 py-3">
        <p className="text-xs text-muted-foreground">{">"} voice_profile</p>
      </div>

      {/* Content */}
      <div className="relative p-4">
        {isLoadingProfile ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        ) : hasProfile ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Enrolled status indicator */}
              <span className="flex size-10 items-center justify-center border border-emerald-500/50 bg-emerald-500/10">
                <CheckIcon className="size-5 text-emerald-500" />
              </span>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  <p className="text-sm text-foreground">enrolled</p>
                </div>
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
              className="group/btn relative border border-border bg-card/50 p-2.5 text-muted-foreground transition-all hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive"
            >
              {deleteMutation.isPending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <TrashIcon className="size-4 transition-transform group-hover/btn:scale-110" />
              )}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowEnrollDialog(true)}
            className="group/enroll relative flex w-full items-center gap-4 border border-dashed border-border bg-card/30 p-5 text-left transition-all hover:border-primary/50 hover:bg-primary/5"
            style={{
              boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.02)",
            }}
          >
            {/* Microphone icon with animation */}
            <div className="relative flex size-12 items-center justify-center border border-border bg-card transition-all group-hover/enroll:border-primary/30 group-hover/enroll:bg-primary/10">
              <MicIcon className="size-5 text-muted-foreground transition-colors group-hover/enroll:text-primary" />
              <SoundWaveBars isAnimating={false} />
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-sm text-foreground">enroll voice profile</p>
              <p className="text-xs text-muted-foreground">
                record a sample to identify your voice
              </p>
            </div>
            {/* Arrow indicator */}
            <span className="text-muted-foreground transition-transform group-hover/enroll:translate-x-1 group-hover/enroll:text-primary">
              {">"}
            </span>
          </button>
        )}
      </div>

      {/* Enrollment Dialog */}
      <Dialog open={showEnrollDialog} onOpenChange={handleCloseEnrollDialog}>
        <DialogContent className="overflow-hidden border border-border bg-background p-0 sm:max-w-lg">
          <ScanlineOverlay />

          <DialogHeader className="border-b border-border bg-card/50 px-5 py-4">
            <DialogTitle className="flex items-center gap-2 text-sm">
              <MicIcon className="size-4 text-primary" />
              <span className="text-primary">{">"}</span> voice_enrollment
            </DialogTitle>
            <DialogDescription className="text-xs">
              Read the passage below clearly into your microphone. This helps us
              identify your voice in recordings.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 p-5">
            {/* Rainbow Passage with styled container */}
            <div className="relative border border-border bg-card/50 p-4">
              <div className="absolute left-0 top-0 h-full w-0.5 bg-gradient-to-b from-primary via-primary/50 to-transparent" />
              <p className="pl-3 text-xs leading-relaxed text-muted-foreground">
                {RAINBOW_PASSAGE}
              </p>
            </div>

            {/* Permission Error */}
            {permissionError && (
              <div
                className="border border-destructive/50 bg-destructive/10 p-3"
                style={{
                  boxShadow: "0 0 20px rgba(255, 68, 68, 0.1)",
                }}
              >
                <p className="text-xs text-destructive">{permissionError}</p>
              </div>
            )}

            {/* Recording Controls */}
            <div className="space-y-4">
              {/* Idle state */}
              {recordingState === "idle" && (
                <div className="flex flex-col items-center gap-5 py-6">
                  <button
                    onClick={startRecording}
                    className="group/rec relative flex size-20 items-center justify-center border border-primary/50 bg-primary/10 transition-all hover:border-primary hover:bg-primary/20"
                  >
                    <MicIcon className="size-8 text-primary transition-transform group-hover/rec:scale-110" />
                  </button>
                  <p className="text-xs text-muted-foreground">
                    Click to begin recording
                  </p>
                </div>
              )}

              {/* Recording state */}
              {recordingState === "recording" && (
                <div className="flex flex-col items-center gap-5 py-6">
                  {/* Animated recording indicator */}
                  <div className="relative">
                    <button
                      onClick={stopRecording}
                      className="relative z-10 flex size-20 items-center justify-center border border-red-500/50 bg-red-500/10 transition-all hover:bg-red-500/20"
                    >
                      <SquareIcon className="size-6 text-red-500" />
                      <PulseRings />
                    </button>
                  </div>

                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-3">
                      <span className="size-2 animate-pulse rounded-full bg-red-500" />
                      <span className="font-mono text-xl tabular-nums text-red-500">
                        {formatDuration(recordingDuration)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Click to stop recording
                    </p>
                  </div>
                </div>
              )}

              {/* Recorded state - WaveSurfer player */}
              {recordingState === "recorded" && (
                <div className="overflow-hidden border border-border bg-card/50">
                  {/* Waveform with overlay effect */}
                  <div className="relative">
                    <div
                      ref={waveformContainerRef}
                      className={cn(
                        "w-full px-4 py-5",
                        !isWaveformReady && "animate-pulse"
                      )}
                    />
                    {/* Gradient overlays */}
                    <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-card/50 to-transparent" />
                    <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-card/50 to-transparent" />
                  </div>

                  {/* Controls */}
                  <div className="flex items-center justify-between border-t border-border bg-card/30 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handlePlayPause}
                        disabled={!isWaveformReady}
                        className="flex size-9 items-center justify-center border border-primary bg-primary text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-30"
                      >
                        {isPlaying ? (
                          <PauseIcon className="size-4" />
                        ) : (
                          <PlayIcon className="size-4" />
                        )}
                      </button>

                      <div className="flex items-center gap-1.5 font-mono text-xs tabular-nums text-muted-foreground">
                        <span className="text-foreground">
                          {formatDuration(currentTime)}
                        </span>
                        <span className="text-border">/</span>
                        <span>{formatDuration(duration)}</span>
                      </div>
                    </div>

                    <button
                      onClick={resetRecording}
                      className="flex items-center gap-1.5 border border-border px-3 py-1.5 text-xs text-muted-foreground transition-all hover:border-foreground/20 hover:text-foreground"
                    >
                      <RotateCcwIcon className="size-3.5" />
                      Restart
                    </button>
                  </div>
                </div>
              )}

              {/* Upload Progress */}
              {isUploading && (
                <div className="space-y-3">
                  <div className="relative h-1 overflow-hidden bg-border">
                    <div
                      className="absolute inset-y-0 left-0 bg-primary transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-center text-xs text-muted-foreground">
                    uploading<span className="animate-pulse">...</span>
                  </p>
                </div>
              )}

              {/* Submit Button */}
              {recordingState === "recorded" && !isUploading && (
                <button
                  onClick={handleEnroll}
                  disabled={recordingDuration < 10}
                  className={cn(
                    "flex w-full items-center justify-center gap-2 border px-4 py-3.5 text-xs transition-all",
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
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="border border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-sm">
              <TrashIcon className="size-4 text-destructive" />
              <span className="text-destructive">{">"}</span> confirm_delete
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Remove voice profile? This will affect speaker identification in
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
                <Loader2Icon className="mr-1.5 size-3 animate-spin" />
              )}
              remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
