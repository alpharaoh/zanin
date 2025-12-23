import { askRecordings, useDeleteRecording, useGetRecording } from "@/api";
import { AskAI } from "@/components/ai/ask-ai";
import { RecordingPlayer } from "@/components/recordings/recording-player";
import { TranscriptViewer } from "@/components/recordings/transcript-viewer";
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
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeftIcon, Loader2Icon, TrashIcon } from "lucide-react";
import { useState, useCallback } from "react";

function RecordingDetailPage() {
  const { recordingId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeTab, setActiveTab] = useState<"transcript" | "analytics">("transcript");

  const { data: recording, isLoading, error } = useGetRecording(recordingId);
  const deleteMutation = useDeleteRecording();

  const handleDelete = useCallback(async () => {
    try {
      await deleteMutation.mutateAsync({ recordingId });
      queryClient.invalidateQueries({ queryKey: ["/v1/recordings"] });
      navigate({ to: "/dashboard/recordings" });
    } catch (error) {
      console.error("Failed to delete recording:", error);
    }
  }, [recordingId, deleteMutation, queryClient, navigate]);

  const handleSeek = useCallback((time: number) => {
    const seekFn = (window as unknown as { seekToTime?: (time: number) => void }).seekToTime;
    if (seekFn) {
      seekFn(time);
    }
  }, []);

  const handleAskAI = useCallback(
    async (query: string) => {
      return askRecordings({ query, recordingId });
    },
    [recordingId]
  );

  if (isLoading) {
    return <RecordingDetailSkeleton />;
  }

  if (error || !recording) {
    return <RecordingNotFound />;
  }

  const ownerSeconds = recording.metadata?.speakerIdentification?.ownerSpeakingSeconds ?? 0;
  const otherSeconds = recording.metadata?.speakerIdentification?.otherSpeakingSeconds ?? 0;
  const totalSeconds = ownerSeconds + otherSeconds;
  const ownerPercent = totalSeconds > 0 ? Math.round((ownerSeconds / totalSeconds) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            to="/dashboard/recordings"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
          >
            <ArrowLeftIcon className="size-3" />
            recordings
          </Link>
          <h1 className="mt-2 truncate text-sm">
            <span className="text-muted-foreground">{">"} </span>
            {recording.title || "untitled"}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <StatusBadge status={recording.status} />
            {recording.originalDuration && (
              <span>{formatDuration(recording.originalDuration)}</span>
            )}
            {recording.finishedAt && (
              <span>{formatRelativeDate(recording.finishedAt)}</span>
            )}
            {recording.confidence && (
              <span>{Math.round(recording.confidence * 100)}% conf</span>
            )}
          </div>
        </div>

        <button
          onClick={() => setShowDeleteDialog(true)}
          className="border border-border p-2 text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive"
        >
          <TrashIcon className="size-4" />
        </button>
      </div>

      {/* Player */}
      <RecordingPlayer
        audioUrl={recording.rawAudioUrl}
        cleanedAudioUrl={recording.cleanedAudioUrl}
        onTimeUpdate={setCurrentTime}
      />

      {/* AI Chat */}
      <AskAI
        onAsk={handleAskAI}
        placeholder="ask about this recording..."
      />

      {/* Tabs */}
      <div className="flex items-center gap-px border border-border">
        <button
          onClick={() => setActiveTab("transcript")}
          className={cn(
            "flex-1 px-4 py-2 text-xs transition-colors",
            activeTab === "transcript"
              ? "bg-primary text-primary-foreground"
              : "bg-card text-muted-foreground hover:text-foreground"
          )}
        >
          transcript
        </button>
        <button
          onClick={() => setActiveTab("analytics")}
          className={cn(
            "flex-1 px-4 py-2 text-xs transition-colors",
            activeTab === "analytics"
              ? "bg-primary text-primary-foreground"
              : "bg-card text-muted-foreground hover:text-foreground"
          )}
        >
          analytics
        </button>
      </div>

      {/* Tab content */}
      {activeTab === "transcript" ? (
        <TranscriptViewer
          transcript={recording.transcript}
          currentTime={currentTime}
          onSeek={handleSeek}
        />
      ) : (
        <div className="space-y-6">
          {/* Speaking Time */}
          <div className="border border-border p-4">
            <p className="mb-4 text-xs text-muted-foreground">{">"} speaking_time</p>

            {/* Bar */}
            <div className="mb-3 h-2 overflow-hidden bg-muted">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${ownerPercent}%` }}
              />
            </div>

            {/* Labels */}
            <div className="flex justify-between text-xs">
              <span>
                <span className="text-primary">{ownerPercent}%</span>
                <span className="ml-2 text-muted-foreground">you ({formatDuration(ownerSeconds)})</span>
              </span>
              <span>
                <span className="text-foreground">{100 - ownerPercent}%</span>
                <span className="ml-2 text-muted-foreground">others ({formatDuration(otherSeconds)})</span>
              </span>
            </div>
          </div>

          {/* Details */}
          <div className="border border-border p-4">
            <p className="mb-4 text-xs text-muted-foreground">{">"} details</p>
            <dl className="space-y-3 text-xs">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">status</dt>
                <dd><StatusBadge status={recording.status} /></dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">duration</dt>
                <dd>{recording.originalDuration ? formatDuration(recording.originalDuration) : "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">language</dt>
                <dd className="uppercase">{recording.metadata?.language ?? "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">speakers</dt>
                <dd>
                  {recording.transcript.length > 0
                    ? new Set(recording.transcript.map((t) => t.speakerNumber)).size
                    : "—"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">words</dt>
                <dd>{recording.transcript.reduce((sum, t) => sum + t.wordCount, 0)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">talk_ratio</dt>
                <dd>
                  {otherSeconds > 0 ? (ownerSeconds / otherSeconds).toFixed(2) : "—"}
                </dd>
              </div>
            </dl>

            {recording.processingError && (
              <div className="mt-4 border border-destructive/50 bg-destructive/10 p-3">
                <p className="text-xs text-destructive">error: {recording.processingError}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="border border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">
              {">"} confirm_delete
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              permanently delete "{recording.title || "untitled"}" and all associated data?
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
              {deleteMutation.isPending && <Loader2Icon className="size-3 animate-spin" />}
              delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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

function RecordingDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-3 w-20" />
        <Skeleton className="mt-3 h-5 w-48" />
        <Skeleton className="mt-2 h-3 w-32" />
      </div>
      <Skeleton className="h-20" />
      <Skeleton className="h-10" />
      <Skeleton className="h-64" />
    </div>
  );
}

function RecordingNotFound() {
  return (
    <div className="border border-dashed border-border p-12 text-center">
      <p className="text-sm">// recording not found</p>
      <p className="mt-1 text-xs text-muted-foreground">
        this recording may have been deleted
      </p>
      <Link
        to="/dashboard/recordings"
        className="mt-4 inline-flex items-center gap-1 text-xs text-primary hover:underline"
      >
        <ArrowLeftIcon className="size-3" />
        back to recordings
      </Link>
    </div>
  );
}

export const Route = createFileRoute("/dashboard/recordings/$recordingId")({
  component: RecordingDetailPage,
});
