import { cn } from "@/lib/utils";
import { XIcon } from "lucide-react";

interface ChatHeaderProps {
  scope: "all" | "recording";
  recordingTitle?: string;
  onClearThread?: () => void;
  hasMessages?: boolean;
}

export function ChatHeader({
  scope,
  recordingTitle,
  onClearThread,
  hasMessages,
}: ChatHeaderProps) {
  return (
    <div className="flex shrink-0 items-center justify-between border-b border-border bg-card/80 px-3 py-2">
      <div className="flex items-center gap-1.5 overflow-hidden">
        <span className="shrink-0 text-xs text-muted-foreground">{">"}</span>
        {scope === "all" ? (
          <span className="text-xs">recordings</span>
        ) : (
          <div className="flex items-center gap-1.5 overflow-hidden">
            <span className="shrink-0 text-xs text-muted-foreground">
              recordings
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">/</span>
            <span className="truncate text-xs">
              {recordingTitle || "untitled"}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        {hasMessages && onClearThread && (
          <button
            onClick={onClearThread}
            className={cn(
              "flex items-center gap-1 border border-transparent p-1.5 text-muted-foreground transition-colors hover:border-border hover:text-foreground"
            )}
            title="Clear thread"
          >
            <XIcon className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
