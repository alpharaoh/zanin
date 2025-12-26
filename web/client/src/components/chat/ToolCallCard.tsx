import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import type { ToolCall } from "@/hooks/useStreamChat";
import { format } from "date-fns";

interface ToolCallCardProps {
  toolCall: ToolCall;
  className?: string;
}

const TOOL_LABELS: Record<string, { running: string; completed: string }> = {
  search_recordings: {
    running: "Searching recordings...",
    completed: "Searched recordings",
  },
  get_recording_details: {
    running: "Fetching recording details...",
    completed: "Fetched recording details",
  },
};

function getToolLabel(name: string, status: "running" | "completed"): string {
  const labels = TOOL_LABELS[name];
  if (labels) {
    return labels[status];
  }
  return status === "running" ? `Running ${name}...` : `Completed ${name}`;
}

export function ToolCallCard({ toolCall, className }: ToolCallCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isRunning = toolCall.status === "running";
  const label = getToolLabel(toolCall.name, toolCall.status);
  const hasResults =
    toolCall.result?.recordings && toolCall.result.recordings.length > 0;

  return (
    <div
      className={cn("border border-border/50 bg-card/30 text-xs", className)}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => {
          if (hasResults) {
            setIsExpanded(!isExpanded);
          }
        }}
        disabled={isRunning || !hasResults}
        className={cn(
          "flex w-full items-center gap-2 px-2.5 py-1.5",
          hasResults && "cursor-pointer hover:bg-card/50"
        )}
      >
        {isRunning ? <Spinner /> : <span className="text-primary">✓</span>}
        <span className="text-muted-foreground">{label}</span>
        {toolCall.result?.count !== undefined && (
          <span className="ml-auto text-muted-foreground/70">
            {toolCall.result.count}{" "}
            {toolCall.result.name === "search_recordings"
              ? "snippet"
              : "recording"}
            {toolCall.result.count !== 1 ? "s" : ""}
          </span>
        )}
        {hasResults && (
          <span className="text-muted-foreground/50">
            {isExpanded ? "▼" : "▶"}
          </span>
        )}
      </button>

      {/* Expandable results */}
      {isExpanded && toolCall.result?.recordings && (
        <div className="border-t border-border/30">
          <div className="flex max-h-48 flex-col gap-2 overflow-y-auto">
            {toolCall.result.name === "search_recordings" ? (
              <div className="px-2.5 py-2 flex flex-col gap-2">
                {toolCall.result.recordings.map((recording) => (
                  <div
                    key={recording.id}
                    className="flex flex-col gap-1.5 border-b pb-4 border-border/20 last:border-0 last:pb-0"
                  >
                    {recording.excerpts && recording.excerpts.length > 0 && (
                      <div className="text-[10px] text-muted-foreground/80">
                        {recording.excerpts.slice(0, 2).map((excerpt, i) => (
                          <p key={i} className="line-clamp-2 italic">
                            "{excerpt}"
                          </p>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      {recording.relevanceScore !== undefined && (
                        <span className="text-[10px] text-primary/70">
                          {Math.round(recording.relevanceScore * 100)}% match
                        </span>
                      )}
                      <Link
                        to="/dashboard/recordings/$recordingId"
                        params={{ recordingId: recording.id }}
                        className="text-[10px] text-foreground/70 hover:text-foreground hover:underline"
                      >
                        Go to recording →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                {toolCall.result.recordings.map((recording) => (
                  <Link
                    key={recording.id}
                    to="/dashboard/recordings/$recordingId"
                    params={{ recordingId: recording.id }}
                    className="flex items-center justify-between gap-2 rounded px-3.5 py-3 hover:bg-card group"
                  >
                    <span className="truncate text-foreground group-hover:underline">
                      {recording.title || "Untitled"}
                    </span>
                    {recording.createdAt && (
                      <span className="shrink-0 text-muted-foreground/60 group-hover:no-underline">
                        {format(new Date(recording.createdAt), "MMM d")}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
