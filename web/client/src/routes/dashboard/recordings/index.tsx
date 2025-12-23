import {
  askRecordings,
  useDeleteRecording,
  useListRecordings,
  type ListRecordingsSortBy,
  type ListRecordingsSortOrder,
  type Recording,
} from "@/api";
import { AskAI } from "@/components/ai/ask-ai";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDuration, formatRelativeDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  Loader2Icon,
  SearchIcon,
  TrashIcon,
  XIcon,
} from "lucide-react";
import debounce from "lodash/debounce";
import { useState, useCallback, useMemo } from "react";
import type { DateRange } from "react-day-picker";

const PAGE_SIZE = 20;

function RecordingsPage() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [sortBy, setSortBy] = useState<ListRecordingsSortBy>("date");
  const [sortOrder, setSortOrder] = useState<ListRecordingsSortOrder>("desc");
  const [deleteRecordingId, setDeleteRecordingId] = useState<string | null>(
    null
  );

  const queryClient = useQueryClient();

  // Debounce search
  const debouncedSetSearch = useMemo(
    () =>
      debounce((value: string) => {
        setDebouncedSearch(value);
      }, 300),
    []
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      setPage(0);
      debouncedSetSearch(value);
    },
    [debouncedSetSearch]
  );

  const { data, isLoading } = useListRecordings({
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    search: debouncedSearch || undefined,
    startDate: dateRange?.from?.toISOString(),
    endDate: dateRange?.to?.toISOString(),
    sortBy,
    sortOrder,
  });

  const deleteMutation = useDeleteRecording();

  const handleAskAI = useCallback(async (query: string) => {
    return askRecordings({ query });
  }, []);

  const toggleSort = useCallback(
    (field: ListRecordingsSortBy) => {
      if (sortBy === field) {
        setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"));
      } else {
        setSortBy(field);
        setSortOrder("desc");
      }
      setPage(0);
    },
    [sortBy]
  );

  const clearFilters = useCallback(() => {
    setSearch("");
    setDebouncedSearch("");
    setDateRange(undefined);
    setSortBy("date");
    setSortOrder("desc");
    setPage(0);
  }, []);

  const hasActiveFilters = debouncedSearch || dateRange?.from || dateRange?.to;

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

      {/* AI Chat */}
      <AskAI onAsk={handleAskAI} />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="flex flex-1 items-center gap-2 border border-border bg-card px-3 py-2">
          <SearchIcon className="size-3.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="search..."
            className="min-w-[120px] flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/50"
          />
          {search && (
            <button
              type="button"
              onClick={() => handleSearchChange("")}
              className="text-muted-foreground hover:text-foreground"
            >
              <XIcon className="size-3" />
            </button>
          )}
        </div>

        {/* Date Range */}
        <Popover>
          <PopoverTrigger
            className={cn(
              "flex items-center gap-2 border border-border bg-card px-3 py-2 text-xs transition-colors hover:border-foreground/20",
              dateRange?.from && "text-foreground"
            )}
          >
            <CalendarIcon className="size-3.5 text-muted-foreground" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, "MMM d")} -{" "}
                  {format(dateRange.to, "MMM d")}
                </>
              ) : (
                format(dateRange.from, "MMM d, yyyy")
              )
            ) : (
              <span className="text-muted-foreground">date</span>
            )}
          </PopoverTrigger>
          <PopoverContent
            className="w-auto border-border bg-card p-0"
            align="start"
          >
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={(range) => {
                setDateRange(range);
                setPage(0);
              }}
              numberOfMonths={2}
            />
            {dateRange?.from && (
              <div className="border-t border-border p-2">
                <button
                  onClick={() => {
                    setDateRange(undefined);
                    setPage(0);
                  }}
                  className="w-full text-xs text-muted-foreground hover:text-foreground"
                >
                  clear dates
                </button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        {/* Sort */}
        <button
          onClick={() => toggleSort("date")}
          className={cn(
            "flex items-center gap-1.5 border border-border bg-card px-3 py-2 text-xs transition-colors hover:border-foreground/20",
            sortBy === "date" && "text-foreground"
          )}
        >
          <CalendarIcon className="size-3.5" />
          date
          {sortBy === "date" &&
            (sortOrder === "desc" ? (
              <ArrowDownIcon className="size-3" />
            ) : (
              <ArrowUpIcon className="size-3" />
            ))}
        </button>

        <button
          onClick={() => toggleSort("duration")}
          className={cn(
            "flex items-center gap-1.5 border border-border bg-card px-3 py-2 text-xs transition-colors hover:border-foreground/20",
            sortBy === "duration" && "text-foreground"
          )}
        >
          <ClockIcon className="size-3.5" />
          duration
          {sortBy === "duration" &&
            (sortOrder === "desc" ? (
              <ArrowDownIcon className="size-3" />
            ) : (
              <ArrowUpIcon className="size-3" />
            ))}
        </button>

        {/* Clear filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <XIcon className="size-3" />
            clear
          </button>
        )}
      </div>

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
              showing {page * PAGE_SIZE + 1}-
              {Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={!hasPrevPage}
                className={cn(
                  "border border-border p-1.5 transition-colors",
                  hasPrevPage
                    ? "hover:border-primary/50 hover:text-primary"
                    : "opacity-30"
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
                  hasNextPage
                    ? "hover:border-primary/50 hover:text-primary"
                    : "opacity-30"
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
              this action cannot be undone. recording will be permanently
              removed.
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
      <div className="col-span-5 min-w-0">
        <Link
          to="/dashboard/recordings/$recordingId"
          params={{ recordingId: recording.id }}
          className="inline-block max-w-full truncate text-muted-foreground hover:text-foreground"
        >
          {recording.title || "untitled"}
        </Link>
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
        <div
          key={i}
          className="border-b border-border px-4 py-3 last:border-b-0"
        >
          <Skeleton className="h-4 w-full" />
        </div>
      ))}
    </div>
  );
}

export const Route = createFileRoute("/dashboard/recordings/")({
  component: RecordingsPage,
});
