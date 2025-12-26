import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import type { ToolCall } from "@/hooks/useStreamChat";

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
  // Fallback for unknown tools
  return status === "running" ? `Running ${name}...` : `Completed ${name}`;
}

export function ToolCallCard({ toolCall, className }: ToolCallCardProps) {
  const isRunning = toolCall.status === "running";
  const label = getToolLabel(toolCall.name, toolCall.status);

  return (
    <div
      className={cn(
        "flex items-center gap-2 border border-border/50 bg-card/30 px-2.5 py-1.5 text-xs",
        className
      )}
    >
      {isRunning ? (
        <Spinner />
      ) : (
        <span className="text-primary">✓</span>
      )}
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}
