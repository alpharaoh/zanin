import {
  useListRecordings,
  useGetSignalsStats,
  useGetAchievements,
  useGetEvaluationsHistory,
} from "@/api";
import {
  RecordingRow,
  RecordingsTableHeader,
} from "@/components/recordings/recording-row";
import { DailySuccessChart } from "@/components/dashboard/DailySuccessChart";
import { PointsProgressionChart } from "@/components/dashboard/PointsProgressionChart";
import { RecentAchievements } from "@/components/dashboard/RecentAchievements";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { FlameIcon } from "lucide-react";

function DashboardIndex() {
  const { data, isLoading } = useListRecordings({ limit: 100 });
  const { data: signalsStats } = useGetSignalsStats();
  const { data: achievementsData } = useGetAchievements();
  const { data: evaluationsHistory } = useGetEvaluationsHistory({ days: 30 });

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
    <div className="mx-auto w-full max-w-5xl space-y-8">
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
          extra={
            stats.processing > 0 ? `${stats.processing} processing` : undefined
          }
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
        <StatBox label="talk_ratio" value={talkRatio} extra="you:others" />
      </div>

      {/* Recent Recordings */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">{">"} recent_recordings</span>
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
            <RecordingsTableHeader />
            {recentRecordings.map((recording) => (
              <RecordingRow key={recording.id} recording={recording} />
            ))}
          </div>
        )}
      </div>

      {/* Signals Section */}
      {signalsStats && signalsStats.totalEvaluations > 0 && (
        <>
          <div className="text-center text-xs text-muted-foreground/30">
            ═══════════════════════════════════════════
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{">"} signals_progress</span>
              <Link
                to="/dashboard/signals"
                className="text-xs text-primary hover:underline"
              >
                manage_signals --&gt;
              </Link>
            </div>

            {/* Signals Stats */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div className="border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">total_points</p>
                <p
                  className={cn(
                    "mt-2 text-xl tabular-nums",
                    signalsStats.totalPoints > 0 && "text-emerald-500",
                    signalsStats.totalPoints < 0 && "text-red-500",
                    signalsStats.totalPoints === 0 && "text-foreground"
                  )}
                >
                  {signalsStats.totalPoints > 0 ? "+" : ""}
                  {signalsStats.totalPoints}
                </p>
              </div>
              <div className="border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">best_streak</p>
                <div
                  className={cn(
                    "mt-2 flex items-center gap-1.5 text-xl tabular-nums",
                    signalsStats.bestCurrentStreak >= 7 && "text-amber-500",
                    signalsStats.bestCurrentStreak >= 3 &&
                      signalsStats.bestCurrentStreak < 7 &&
                      "text-amber-400/70",
                    signalsStats.bestCurrentStreak < 3 && "text-foreground"
                  )}
                >
                  {signalsStats.bestCurrentStreak > 0 && (
                    <FlameIcon className="size-5" />
                  )}
                  {signalsStats.bestCurrentStreak}
                </div>
                {signalsStats.longestEverStreak > signalsStats.bestCurrentStreak && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    best: {signalsStats.longestEverStreak}
                  </p>
                )}
              </div>
              <div className="border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">success_rate</p>
                <p className="mt-2 text-xl tabular-nums">
                  {signalsStats.overallSuccessRate}%
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {signalsStats.totalEvaluations} evals
                </p>
              </div>
              <div className="border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">achievements</p>
                <p className="mt-2 text-xl tabular-nums">
                  {signalsStats.achievementsUnlocked}/{signalsStats.totalAchievements}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {signalsStats.activeSignals} active signals
                </p>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Daily Success Rate */}
              <div className="border border-border p-4">
                <p className="mb-4 text-xs text-muted-foreground">
                  {">"} daily_success_rate (14d)
                </p>
                <DailySuccessChart
                  evaluations={evaluationsHistory ?? []}
                  days={14}
                />
              </div>

              {/* Recent Achievements */}
              <div className="border border-border p-4">
                <p className="mb-4 text-xs text-muted-foreground">
                  {">"} recent_achievements
                </p>
                <RecentAchievements
                  achievements={achievementsData?.achievements ?? []}
                  definitions={achievementsData?.definitions ?? {}}
                  limit={4}
                />
              </div>
            </div>

            {/* Points Progression */}
            <div className="border border-border p-4">
              <p className="mb-4 text-xs text-muted-foreground">
                {">"} points_progression (30d)
              </p>
              <PointsProgressionChart evaluations={evaluationsHistory ?? []} />
            </div>
          </div>
        </>
      )}

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
      {extra && <p className="mt-1 text-xs text-muted-foreground">{extra}</p>}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
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
