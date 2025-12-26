import { type Recording } from "@/api";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { formatDistance } from "date-fns";
import { TrashIcon } from "lucide-react";
import { useState } from "react";

function StatusBadge({ status }: { status: string }) {
  const config = {
    completed: { dot: "bg-emerald-500", text: "done" },
    processing: { dot: "bg-primary animate-pulse", text: "processing" },
    pending: { dot: "bg-amber-500", text: "queued" },
    failed: { dot: "bg-red-500", text: "failed" },
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
  const isProcessing =
    recording.status === "processing" || recording.status === "pending";

  const columns = showDelete ? "grid-cols-12" : "grid-cols-12";

  const rowClassName = cn(
    "group grid gap-4 border-b border-border px-4 py-3 text-sm transition-colors last:border-b-0 no-underline",
    columns,
    isProcessing
      ? "cursor-not-allowed opacity-60"
      : "hover:bg-neutral-800/50 cursor-pointer"
  );

  const content = (
    <>
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
        {formatDistance(recording.createdAt, new Date(), { addSuffix: true })}
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
    </>
  );

  if (isProcessing) {
    return (
      <div
        className={rowClassName}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      to="/dashboard/recordings/$recordingId"
      params={{ recordingId: recording.id }}
      className={rowClassName}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {content}
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
