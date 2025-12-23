import { type Recording } from "@/api";
import { formatDuration, formatRelativeDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { TrashIcon } from "lucide-react";
import { useState } from "react";

function StatusBadge({ status }: { status: string }) {
  const config = {
    completed: { dot: "bg-emerald-500", text: "done" },
    processing: { dot: "bg-primary animate-pulse", text: "proc" },
    pending: { dot: "bg-amber-500", text: "queue" },
    failed: { dot: "bg-red-500", text: "fail" },
  }[status] || { dot: "bg-muted-foreground", text: status };

  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span className={`size-1.5 rounded-full ${config.dot}`} />
      <span className="text-muted-foreground">{config.text}</span>
    </span>
  );
}

interface RecordingRowProps {
  recording: Recording;
  onDelete?: (id: string) => void;
  showDelete?: boolean;
}

export function RecordingRow({
  recording,
  onDelete,
  showDelete = false,
}: RecordingRowProps) {
  const [isHovered, setIsHovered] = useState(false);

  const columns = showDelete ? "grid-cols-12" : "grid-cols-12";

  return (
    <Link
      to="/dashboard/recordings/$recordingId"
      params={{ recordingId: recording.id }}
      className={cn(
        "group grid gap-4 border-b border-border px-4 py-3 text-sm transition-colors last:border-b-0 hover:bg-neutral-800/50 no-underline",
        columns
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={cn(
          "truncate transition-colors",
          showDelete ? "col-span-5" : "col-span-6",
          isHovered ? "text-neutral-300" : "text-muted-foreground"
        )}
      >
        {recording.title || "untitled"}
      </div>
      <div className="col-span-2">
        <StatusBadge status={recording.status} />
      </div>
      <div className="col-span-2 text-right text-muted-foreground">
        {recording.originalDuration
          ? formatDuration(recording.originalDuration)
          : "—"}
      </div>
      <div className="col-span-2 text-right text-muted-foreground">
        {recording.finishedAt ? formatRelativeDate(recording.finishedAt) : "—"}
      </div>
      {showDelete && onDelete && (
        <div className="col-span-1 flex justify-end">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete(recording.id);
            }}
            className={cn(
              "p-1 text-muted-foreground transition-all hover:text-destructive",
              isHovered ? "opacity-100" : "opacity-0"
            )}
          >
            <TrashIcon className="size-3.5" />
          </button>
        </div>
      )}
    </Link>
  );
}

interface RecordingsTableHeaderProps {
  showDelete?: boolean;
}

export function RecordingsTableHeader({
  showDelete = false,
}: RecordingsTableHeaderProps) {
  return (
    <div
      className={cn(
        "grid gap-4 border-b border-border bg-card px-4 py-2 text-xs text-muted-foreground",
        showDelete ? "grid-cols-12" : "grid-cols-12"
      )}
    >
      <div className={showDelete ? "col-span-5" : "col-span-6"}>title</div>
      <div className="col-span-2">status</div>
      <div className="col-span-2 text-right">duration</div>
      <div className="col-span-2 text-right">date</div>
      {showDelete && <div className="col-span-1"></div>}
    </div>
  );
}
