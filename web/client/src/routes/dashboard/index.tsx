import { useListRecordings, type Recording } from "@/api";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDuration, formatRelativeDate } from "@/lib/format";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";

function DashboardIndex() {
  const { data, isLoading } = useListRecordings({ limit: 100 });

  const stats = useMemo(() => {
    if (!data?.recordings) {
      return {
        total: 0,
        completed: 0,
        processing: 0,
        totalDuration: 0,
        yourSpeakingTime: 0,
        othersSpeakingTime: 0,
      };
    }

    const recordings = data.recordings;
    let totalDuration = 0;
    let yourSpeakingTime = 0;
    let othersSpeakingTime = 0;

    for (const recording of recordings) {
      if (recording.originalDuration) {
        totalDuration += recording.originalDuration;
      }
      if (recording.metadata?.speakerIdentification) {
        yourSpeakingTime +=
          recording.metadata.speakerIdentification.ownerSpeakingSeconds;
        othersSpeakingTime +=
          recording.metadata.speakerIdentification.otherSpeakingSeconds;
      }
    }

    return {
      total: recordings.length,
      completed: recordings.filter((r) => r.status === "completed").length,
      processing: recordings.filter(
        (r) => r.status === "processing" || r.status === "pending"
      ).length,
      totalDuration,
      yourSpeakingTime,
      othersSpeakingTime,
    };
  }, [data]);

  const recentRecordings = useMemo(() => {
    if (!data?.recordings) {
      return [];
    }
    return data.recordings.slice(0, 5);
  }, [data]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const talkRatio =
    stats.othersSpeakingTime > 0
      ? (stats.yourSpeakingTime / stats.othersSpeakingTime).toFixed(2)
      : "—";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <span className="text-muted-foreground">~/</span>
        <span className="text-primary">dashboard</span>
      </div>

      {/* Stats Grid - Terminal style boxes */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatBox
          label="recordings"
          value={stats.total.toString()}
          extra={stats.processing > 0 ? `${stats.processing} processing` : undefined}
        />
        <StatBox
          label="you_spoke"
          value={formatDuration(stats.yourSpeakingTime)}
          extra={
            stats.yourSpeakingTime + stats.othersSpeakingTime > 0
              ? `${Math.round(
                  (stats.yourSpeakingTime /
                    (stats.yourSpeakingTime + stats.othersSpeakingTime)) *
                    100
                )}%`
              : undefined
          }
        />
        <StatBox
          label="others_spoke"
          value={formatDuration(stats.othersSpeakingTime)}
        />
        <StatBox
          label="talk_ratio"
          value={talkRatio}
          extra="you:others"
        />
      </div>

      {/* Recent Recordings */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">
            {">"} recent_recordings
          </span>
          <Link
            to="/dashboard/recordings"
            className="text-xs text-primary hover:underline"
          >
            view_all --&gt;
          </Link>
        </div>

        {recentRecordings.length === 0 ? (
          <div className="border border-dashed border-border p-8 text-center">
            <p className="text-muted-foreground">// no recordings found</p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              connect device to start capture
            </p>
          </div>
        ) : (
          <div className="border border-border">
            {/* Table header */}
            <div className="grid grid-cols-12 gap-4 border-b border-border bg-card px-4 py-2 text-xs text-muted-foreground">
              <div className="col-span-6">title</div>
              <div className="col-span-2">status</div>
              <div className="col-span-2 text-right">duration</div>
              <div className="col-span-2 text-right">date</div>
            </div>
            {/* Table rows */}
            {recentRecordings.map((recording, index) => (
              <RecordingRow key={index} recording={recording} />
            ))}
          </div>
        )}
      </div>

      {/* ASCII decoration */}
      <div className="text-center text-xs text-muted-foreground/30">
        ═══════════════════════════════════════════
      </div>
    </div>
  );
}

interface StatBoxProps {
  label: string;
  value: string;
  extra?: string;
}

function StatBox({ label, value, extra }: StatBoxProps) {
  return (
    <div className="border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl text-foreground">{value}</p>
      {extra && (
        <p className="mt-1 text-xs text-muted-foreground">{extra}</p>
      )}
    </div>
  );
}

function RecordingRow({ recording }: { recording: Recording }) {
  return (
    <Link
      to="/dashboard/recordings/$recordingId"
      params={{ recordingId: recording.id }}
      className="grid grid-cols-12 gap-4 border-b border-border px-4 py-3 text-sm transition-colors last:border-b-0 hover:bg-card"
    >
      <div className="col-span-6 truncate">
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
        {recording.finishedAt
          ? formatRelativeDate(recording.finishedAt)
          : "—"}
      </div>
    </Link>
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

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-5 w-32" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <div className="space-y-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}

export const Route = createFileRoute("/dashboard/")({
  component: DashboardIndex,
});
