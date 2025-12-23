import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatTimestamp } from "@/lib/format";
import type { RecordingTranscriptItem } from "@/api";
import { useEffect, useRef } from "react";

interface TranscriptViewerProps {
  transcript: RecordingTranscriptItem[];
  currentTime?: number;
  onSeek?: (time: number) => void;
  className?: string;
}

export function TranscriptViewer({
  transcript,
  currentTime = 0,
  onSeek,
  className,
}: TranscriptViewerProps) {
  const activeSegmentRef = useRef<HTMLDivElement>(null);

  const activeIndex = transcript.findIndex(
    (segment) => currentTime >= segment.start && currentTime < segment.end
  );

  useEffect(() => {
    if (activeSegmentRef.current) {
      activeSegmentRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [activeIndex]);

  if (transcript.length === 0) {
    return (
      <div className={cn("border border-dashed border-border p-8 text-center", className)}>
        <p className="text-sm text-muted-foreground">// no transcript available</p>
      </div>
    );
  }

  return (
    <div className={cn("border border-border", className)}>
      <ScrollArea className="h-[360px]">
        <div className="divide-y divide-border">
          {transcript.map((segment, index) => {
            const isActive = index === activeIndex;
            const isPast = currentTime > segment.end;
            const isYou = segment.speaker === "ME";

            return (
              <div
                key={index}
                ref={isActive ? activeSegmentRef : null}
                className={cn(
                  "p-4 transition-all",
                  isActive && "bg-primary/5",
                  isPast && !isActive && "opacity-50"
                )}
              >
                <div className="mb-2 flex items-center gap-3 text-xs">
                  <span className={cn(isYou ? "text-primary" : "text-muted-foreground")}>
                    {isYou ? "you" : `speaker_${segment.speakerNumber}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => onSeek?.(segment.start)}
                    className="text-muted-foreground/50 transition-colors hover:text-primary"
                  >
                    [{formatTimestamp(segment.start)}]
                  </button>
                </div>
                <p className={cn(
                  "text-sm leading-relaxed",
                  isActive ? "text-foreground" : "text-muted-foreground"
                )}>
                  {segment.content}
                </p>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
