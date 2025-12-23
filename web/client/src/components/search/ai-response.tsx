import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { XIcon } from "lucide-react";
import { SourceCitation } from "./source-citation";
import type { RecordingAskResponse } from "@/api";

interface AIResponseProps {
  response: RecordingAskResponse | null;
  query: string;
  isLoading?: boolean;
  onClear: () => void;
  className?: string;
}

export function AIResponse({
  response,
  query,
  isLoading,
  onClear,
  className,
}: AIResponseProps) {
  if (!isLoading && !response) {
    return null;
  }

  return (
    <div className={cn("relative", className)}>
      {/* Dismiss button */}
      <button
        onClick={onClear}
        className="absolute -right-2 -top-2 z-10 rounded-full bg-card p-1 text-muted-foreground shadow-sm transition-colors hover:text-foreground"
      >
        <XIcon className="size-3" />
      </button>

      <div className="rounded-lg border bg-card/50 p-4">
        {isLoading ? (
          <AIResponseSkeleton />
        ) : response ? (
          <div className="space-y-4">
            {/* Query echo */}
            <p className="text-[11px] text-muted-foreground">
              <span className="font-medium">Q:</span> {query}
            </p>

            {/* Answer */}
            <p className="text-sm leading-relaxed">{response.answer}</p>

            {/* Sources */}
            {response.sources.length > 0 && (
              <div className="space-y-2 pt-2">
                <p className="section-label">Sources</p>
                <div className="space-y-1.5">
                  {response.sources.map((source, index) => (
                    <SourceCitation
                      key={`${source.recordingId}-${index}`}
                      source={source}
                      index={index}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function AIResponseSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-3 w-48" />
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}
