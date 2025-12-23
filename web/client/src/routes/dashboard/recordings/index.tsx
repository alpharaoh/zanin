import {
  useDeleteRecording,
  useListRecordings,
  type Recording,
  type RecordingAskResponse,
} from "@/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDuration, formatRelativeDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  Loader2Icon,
  SearchIcon,
  TrashIcon,
  XIcon,
} from "lucide-react";
import { useState, useCallback } from "react";

const PAGE_SIZE = 20;

function RecordingsPage() {
  const [page, setPage] = useState(0);
  const [aiQuery, setAiQuery] = useState("");
  const [aiInputValue, setAiInputValue] = useState("");
  const [aiResponse, setAiResponse] = useState<RecordingAskResponse | null>(null);
  const [deleteRecordingId, setDeleteRecordingId] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const queryClient = useQueryClient();

  const { data, isLoading } = useListRecordings({
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  const deleteMutation = useDeleteRecording();

  const handleSearch = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!aiInputValue.trim()) {
        return;
      }

      setAiQuery(aiInputValue);
      setAiResponse(null);
      setIsAiLoading(true);

      try {
        const response = await queryClient.fetchQuery({
          queryKey: ["/v1/recordings/ask", { query: aiInputValue }],
          queryFn: async () => {
            const { askRecordings } = await import("@/api");
            return askRecordings({ query: aiInputValue });
          },
        });
        setAiResponse(response);
      } catch (error) {
        console.error("Failed to fetch AI response:", error);
      } finally {
        setIsAiLoading(false);
      }
    },
    [aiInputValue, queryClient]
  );

  const handleClearAI = useCallback(() => {
    setAiQuery("");
    setAiInputValue("");
    setAiResponse(null);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deleteRecordingId) {
      return;
    }

    try {
      await deleteMutation.mutateAsync({ recordingId: deleteRecordingId });
      queryClient.invalidateQueries({ queryKey: ["/v1/recordings"] });
      setDeleteRecordingId(null);
    } catch (error) {
      console.error("Failed to delete recording:", error);
    }
  }, [deleteRecordingId, deleteMutation, queryClient]);

  const recordings = data?.recordings ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const hasNextPage = page < totalPages - 1;
  const hasPrevPage = page > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <span className="text-muted-foreground">~/</span>
        <span className="text-primary">recordings</span>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="border border-border bg-card">
        <div className="flex items-center gap-3 px-4 py-3">
          <SearchIcon className="size-4 text-muted-foreground" />
          <input
            type="text"
            value={aiInputValue}
            onChange={(e) => setAiInputValue(e.target.value)}
            placeholder="ask anything about your recordings..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
          />
          {isAiLoading && (
            <Loader2Icon className="size-4 animate-spin text-primary" />
          )}
          {aiQuery && !isAiLoading && (
            <button
              type="button"
              onClick={handleClearAI}
              className="text-muted-foreground hover:text-foreground"
            >
              <XIcon className="size-4" />
            </button>
          )}
        </div>
      </form>

      {/* AI Response */}
      {(aiResponse || isAiLoading) && (
        <div className="border border-primary/30 bg-primary/5 p-4">
          <div className="mb-2 text-xs text-primary">{">"} ai_response</div>
          {isAiLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="animate-pulse">processing query</span>
              <span className="animate-pulse">...</span>
            </div>
          ) : aiResponse ? (
            <>
              <p className="text-sm leading-relaxed">{aiResponse.answer}</p>
              {aiResponse.sources && aiResponse.sources.length > 0 && (
                <div className="mt-4 border-t border-border pt-3">
                  <p className="mb-2 text-xs text-muted-foreground">sources:</p>
                  <div className="flex flex-wrap gap-2">
                    {aiResponse.sources.map((source, i) => (
                      <Link
                        key={i}
                        to="/dashboard/recordings/$recordingId"
                        params={{ recordingId: source.recordingId }}
                        className="inline-flex items-center gap-1.5 border border-border bg-card px-2 py-1 text-xs hover:border-primary/50"
                      >
                        <span className="text-muted-foreground">[{i + 1}]</span>
                        <span className="max-w-[200px] truncate">{source.text}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      )}

      {/* Recordings Table */}
      {isLoading ? (
        <RecordingsSkeleton />
      ) : recordings.length === 0 ? (
        <div className="border border-dashed border-border p-8 text-center">
          <p className="text-muted-foreground">// no recordings found</p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            connect device to start capture
          </p>
        </div>
      ) : (
        <>
          <div className="border border-border">
            {/* Table header */}
            <div className="grid grid-cols-12 gap-4 border-b border-border bg-card px-4 py-2 text-xs text-muted-foreground">
              <div className="col-span-5">title</div>
              <div className="col-span-2">status</div>
              <div className="col-span-2 text-right">duration</div>
              <div className="col-span-2 text-right">date</div>
              <div className="col-span-1"></div>
            </div>
            {/* Table rows */}
            {recordings.map((recording, index) => (
              <RecordingRow
                key={index}
                recording={recording}
                onDelete={(id) => setDeleteRecordingId(id)}
              />
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              showing {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={!hasPrevPage}
                className={cn(
                  "border border-border p-1.5 transition-colors",
                  hasPrevPage ? "hover:border-primary/50 hover:text-primary" : "opacity-30"
                )}
              >
                <ChevronLeftIcon className="size-4" />
              </button>
              <span className="px-3 text-muted-foreground">
                {page + 1}/{totalPages || 1}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasNextPage}
                className={cn(
                  "border border-border p-1.5 transition-colors",
                  hasNextPage ? "hover:border-primary/50 hover:text-primary" : "opacity-30"
                )}
              >
                <ChevronRightIcon className="size-4" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Delete Dialog */}
      <AlertDialog
        open={!!deleteRecordingId}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteRecordingId(null);
          }
        }}
      >
        <AlertDialogContent className="border border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">
              {">"} confirm_delete
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              this action cannot be undone. recording will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border border-border bg-transparent text-xs hover:bg-card">
              cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="border border-destructive bg-destructive/10 text-xs text-destructive hover:bg-destructive hover:text-white"
            >
              {deleteMutation.isPending && (
                <Loader2Icon className="size-3 animate-spin" />
              )}
              delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface RecordingRowProps {
  recording: Recording;
  onDelete: (id: string) => void;
}

function RecordingRow({ recording, onDelete }: RecordingRowProps) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      className="group grid grid-cols-12 gap-4 border-b border-border px-4 py-3 text-sm transition-colors last:border-b-0 hover:bg-card"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <Link
        to="/dashboard/recordings/$recordingId"
        params={{ recordingId: recording.id }}
        className="col-span-5 truncate hover:text-primary"
      >
        {recording.title || "untitled"}
      </Link>
      <div className="col-span-2">
        <StatusBadge status={recording.status} />
      </div>
      <div className="col-span-2 text-right text-muted-foreground">
        {recording.originalDuration
          ? formatDuration(recording.originalDuration)
          : "—"}
      </div>
      <div className="col-span-2 text-right text-muted-foreground">
        {recording.finishedAt
          ? formatRelativeDate(recording.finishedAt)
          : "—"}
      </div>
      <div className="col-span-1 flex justify-end">
        <button
          onClick={() => onDelete(recording.id)}
          className={cn(
            "p-1 text-muted-foreground transition-all hover:text-destructive",
            showActions ? "opacity-100" : "opacity-0"
          )}
        >
          <TrashIcon className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

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

function RecordingsSkeleton() {
  return (
    <div className="border border-border">
      <div className="border-b border-border bg-card px-4 py-2">
        <Skeleton className="h-4 w-full" />
      </div>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="border-b border-border px-4 py-3 last:border-b-0">
          <Skeleton className="h-4 w-full" />
        </div>
      ))}
    </div>
  );
}

export const Route = createFileRoute("/dashboard/recordings/")({
  component: RecordingsPage,
});
