import { cn } from "@/lib/utils";
import { MessageSquarePlusIcon } from "lucide-react";

interface ChatHeaderProps {
  scope: "all" | "recording";
  recordingTitle?: string;
  onNewThread?: () => void;
  hasMessages?: boolean;
}

export function ChatHeader({
  scope,
  recordingTitle,
  onNewThread,
  hasMessages,
}: ChatHeaderProps) {
  return (
    <div className="flex h-10 shrink-0 items-center justify-between border-b border-border bg-card/80 px-3">
      <div className="flex items-center gap-1.5 overflow-hidden">
        <span className="shrink-0 text-xs text-muted-foreground">{">"}</span>
        <div className="flex items-center gap-1.5 overflow-hidden">
          <span className="shrink-0 text-xs text-muted-foreground">
            recordings
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">/</span>
          <span className="truncate text-xs">
            {scope === "all" ? "all" : recordingTitle || "untitled"}
          </span>
        </div>
      </div>

      <button
        onClick={onNewThread}
        disabled={!hasMessages}
        className={cn(
          "flex items-center gap-1.5 border px-1.25 py-1 text-[10px] transition-colors",
          hasMessages
            ? "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
            : "cursor-default border-transparent text-muted-foreground/30"
        )}
        title="Start new thread"
      >
        <MessageSquarePlusIcon className="size-3.5" />
      </button>
    </div>
  );
}
