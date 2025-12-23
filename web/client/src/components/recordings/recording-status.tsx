import { cn } from "@/lib/utils";
import type { RecordingStatus } from "@/api";

interface RecordingStatusBadgeProps {
  status: RecordingStatus;
  className?: string;
}

const statusConfig: Record<
  RecordingStatus,
  {
    label: string;
    dotClass: string;
    textClass: string;
  }
> = {
  pending: {
    label: "Pending",
    dotClass: "bg-muted-foreground/40",
    textClass: "text-muted-foreground",
  },
  processing: {
    label: "Processing",
    dotClass: "bg-amber-500 animate-pulse",
    textClass: "text-amber-600",
  },
  completed: {
    label: "Done",
    dotClass: "bg-emerald-500",
    textClass: "text-emerald-600",
  },
  failed: {
    label: "Failed",
    dotClass: "bg-red-500",
    textClass: "text-red-600",
  },
};

export function RecordingStatusBadge({
  status,
  className,
}: RecordingStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] font-medium",
        config.textClass,
        className
      )}
    >
      <span className={cn("size-1.5 rounded-full", config.dotClass)} />
      {config.label}
    </span>
  );
}
