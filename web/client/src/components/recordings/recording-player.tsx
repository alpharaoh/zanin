import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/format";
import {
  DownloadIcon,
  PauseIcon,
  PlayIcon,
  RotateCcwIcon,
  RotateCwIcon,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";

interface RecordingPlayerProps {
  audioUrl: string;
  cleanedAudioUrl?: string;
  onTimeUpdate?: (time: number) => void;
  className?: string;
}

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function RecordingPlayer({
  audioUrl,
  cleanedAudioUrl,
  onTimeUpdate,
  className,
}: RecordingPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isReady, setIsReady] = useState(false);
  const [useCleanedAudio, setUseCleanedAudio] = useState(!!cleanedAudioUrl);

  const activeUrl = useCleanedAudio && cleanedAudioUrl ? cleanedAudioUrl : audioUrl;

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
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

    wavesurfer.load(activeUrl);

    wavesurfer.on("ready", () => {
      setDuration(wavesurfer.getDuration());
      setIsReady(true);
      wavesurferRef.current = wavesurfer;
    });

    wavesurfer.on("timeupdate", (time) => {
      setCurrentTime(time);
      onTimeUpdate?.(time);
    });

    wavesurfer.on("play", () => setIsPlaying(true));
    wavesurfer.on("pause", () => setIsPlaying(false));
    wavesurfer.on("finish", () => setIsPlaying(false));

    return () => {
      wavesurfer.destroy();
    };
  }, [activeUrl, onTimeUpdate]);

  useEffect(() => {
    if (wavesurferRef.current) {
      wavesurferRef.current.setPlaybackRate(playbackRate);
    }
  }, [playbackRate]);

  const handlePlayPause = useCallback(() => {
    wavesurferRef.current?.playPause();
  }, []);

  const handleSkip = useCallback((seconds: number) => {
    if (wavesurferRef.current) {
      const newTime = Math.max(
        0,
        Math.min(
          wavesurferRef.current.getCurrentTime() + seconds,
          wavesurferRef.current.getDuration()
        )
      );
      wavesurferRef.current.seekTo(newTime / wavesurferRef.current.getDuration());
    }
  }, []);

  const seekTo = useCallback(
    (time: number) => {
      if (wavesurferRef.current && duration > 0) {
        wavesurferRef.current.seekTo(time / duration);
      }
    },
    [duration]
  );

  useEffect(() => {
    (window as unknown as { seekToTime?: (time: number) => void }).seekToTime = seekTo;
    return () => {
      delete (window as unknown as { seekToTime?: (time: number) => void }).seekToTime;
    };
  }, [seekTo]);

  const cycleSpeed = useCallback(() => {
    const currentIndex = PLAYBACK_SPEEDS.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % PLAYBACK_SPEEDS.length;
    setPlaybackRate(PLAYBACK_SPEEDS[nextIndex]);
  }, [playbackRate]);

  return (
    <div className={cn("border border-border bg-card", className)}>
      {/* Waveform */}
      <div
        ref={containerRef}
        className={cn(
          "w-full p-4",
          !isReady && "animate-pulse"
        )}
      />

      {/* Controls */}
      <div className="flex items-center justify-between border-t border-border px-4 py-3">
        <div className="flex items-center gap-2">
          {/* Skip back */}
          <button
            onClick={() => handleSkip(-10)}
            disabled={!isReady}
            className="border border-border p-1.5 text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-30"
          >
            <RotateCcwIcon className="size-3.5" />
          </button>

          {/* Play/Pause */}
          <button
            onClick={handlePlayPause}
            disabled={!isReady}
            className="border border-primary bg-primary p-2 text-primary-foreground transition-opacity hover:opacity-80 disabled:opacity-30"
          >
            {isPlaying ? (
              <PauseIcon className="size-4" />
            ) : (
              <PlayIcon className="size-4" />
            )}
          </button>

          {/* Skip forward */}
          <button
            onClick={() => handleSkip(10)}
            disabled={!isReady}
            className="border border-border p-1.5 text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-30"
          >
            <RotateCwIcon className="size-3.5" />
          </button>

          {/* Time */}
          <span className="ml-3 text-xs text-muted-foreground">
            {formatDuration(currentTime)}
            <span className="mx-1 text-border">/</span>
            {formatDuration(duration)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Speed */}
          <button
            onClick={cycleSpeed}
            disabled={!isReady}
            className="border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-30"
          >
            {playbackRate}x
          </button>

          {/* Audio source toggle */}
          {cleanedAudioUrl && (
            <div className="flex items-center border border-border text-xs">
              <button
                onClick={() => setUseCleanedAudio(true)}
                className={cn(
                  "px-2 py-1 transition-colors",
                  useCleanedAudio
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                cleaned
              </button>
              <button
                onClick={() => setUseCleanedAudio(false)}
                className={cn(
                  "px-2 py-1 transition-colors",
                  !useCleanedAudio
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                original
              </button>
            </div>
          )}

          {/* Download */}
          <a
            href={activeUrl}
            download
            className="border border-border p-1.5 text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
          >
            <DownloadIcon className="size-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
