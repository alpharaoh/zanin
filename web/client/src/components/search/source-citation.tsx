import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { ArrowRightIcon } from "lucide-react";
import type { AnswerSource } from "@/api";

interface SourceCitationProps {
  source: AnswerSource;
  index: number;
  className?: string;
}

export function SourceCitation({ source, index, className }: SourceCitationProps) {
  return (
    <Link
      to="/dashboard/recordings/$recordingId"
      params={{ recordingId: source.recordingId }}
      className={cn(
        "group flex items-start gap-2 rounded-md p-2 -mx-2",
        "text-sm transition-colors hover:bg-muted/50",
        className
      )}
    >
      <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded bg-muted text-[10px] font-medium text-muted-foreground">
        {index + 1}
      </span>
      <span className="flex-1 text-muted-foreground line-clamp-2 text-xs leading-relaxed">
        {source.text}
      </span>
      <ArrowRightIcon className="mt-0.5 size-3 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-foreground" />
    </Link>
  );
}
