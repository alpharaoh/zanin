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
    return data.recordings.slice(0, 3);
  }, [data]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const talkRatio =
    stats.othersSpeakingTime > 0
      ? (stats.yourSpeakingTime / stats.othersSpeakingTime).toFixed(2)
      : "—";

  const hasSignalsData = signalsStats && signalsStats.totalEvaluations > 0;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <span className="text-muted-foreground">~/</span>
        <span className="text-primary">dashboard</span>
      </div>

      {/* Unified Stats Grid */}
      <div
        className={cn(
          "grid gap-3",
          hasSignalsData
            ? "grid-cols-2 lg:grid-cols-6"
            : "grid-cols-2 lg:grid-cols-4"
        )}
      >
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

        {/* Signals stats integrated when available */}
        {hasSignalsData && (
          <>
            <div className="border border-border bg-card p-3">
              <p className="text-[10px] text-muted-foreground">signal_points</p>
              <p
                className={cn(
                  "mt-1 text-lg tabular-nums",
                  signalsStats.totalPoints > 0 && "text-emerald-500",
                  signalsStats.totalPoints < 0 && "text-red-500",
                  signalsStats.totalPoints === 0 && "text-foreground"
                )}
              >
                {signalsStats.totalPoints > 0 ? "+" : ""}
                {signalsStats.totalPoints}
              </p>
            </div>
            <div className="border border-border bg-card p-3">
              <p className="text-[10px] text-muted-foreground">signal_streak</p>
              <div
                className={cn(
                  "mt-1 flex items-center gap-1 text-lg tabular-nums",
                  signalsStats.bestCurrentStreak >= 7 && "text-amber-500",
                  signalsStats.bestCurrentStreak >= 3 &&
                    signalsStats.bestCurrentStreak < 7 &&
                    "text-amber-400/70",
                  signalsStats.bestCurrentStreak < 3 && "text-foreground"
                )}
              >
                {signalsStats.bestCurrentStreak > 0 && (
                  <FlameIcon className="size-4" />
                )}
                {signalsStats.bestCurrentStreak}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Recent Recordings */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
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
            <RecordingsTableHeader />
            {recentRecordings.map((recording) => (
              <RecordingRow key={recording.id} recording={recording} />
            ))}
          </div>
        )}
      </div>

      {/* Signals Section */}
      {hasSignalsData && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{">"} signals</span>
            <Link
              to="/dashboard/signals"
              className="text-xs text-primary hover:underline"
            >
              manage --&gt;
            </Link>
          </div>

          {/* Two-column layout for charts and achievements */}
          <div className="grid gap-3 lg:grid-cols-2">
            {/* Daily Success Chart */}
            <div className="border border-border p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground">
                  success_rate (14d)
                </p>
                <p className="text-[10px] tabular-nums text-muted-foreground">
                  {signalsStats.overallSuccessRate}% avg
                </p>
              </div>
              <DailySuccessChart
                evaluations={evaluationsHistory ?? []}
                days={14}
              />
            </div>

            {/* Recent Achievements or Points Progression */}
            {achievementsData && achievementsData.achievements.length > 0 ? (
              <div className="border border-border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[10px] text-muted-foreground">
                    recent_achievements
                  </p>
                  <p className="text-[10px] tabular-nums text-muted-foreground">
                    {signalsStats.achievementsUnlocked}/
                    {signalsStats.totalAchievements}
                  </p>
                </div>
                <RecentAchievements
                  achievements={achievementsData.achievements}
                  definitions={achievementsData.definitions}
                  limit={3}
                />
              </div>
            ) : (
              evaluationsHistory &&
              evaluationsHistory.length >= 2 && (
                <div className="border border-border p-3">
                  <p className="mb-2 text-[10px] text-muted-foreground">
                    points_progression (30d)
                  </p>
                  <PointsProgressionChart evaluations={evaluationsHistory} />
                </div>
              )
            )}
          </div>

          {/* Points Progression - show below if achievements exist */}
          {achievementsData &&
            achievementsData.achievements.length > 0 &&
            evaluationsHistory &&
            evaluationsHistory.length >= 2 && (
              <div className="border border-border p-3">
                <p className="mb-2 text-[10px] text-muted-foreground">
                  points_progression (30d)
                </p>
                <PointsProgressionChart evaluations={evaluationsHistory} />
              </div>
            )}
        </div>
      )}
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
    <div className="border border-border bg-card p-3">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg text-foreground">{value}</p>
      {extra && (
        <p className="mt-0.5 text-[10px] text-muted-foreground">{extra}</p>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <Skeleton className="h-5 w-32" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Skeleton className="h-64" />
        </div>
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}

export const Route = createFileRoute("/dashboard/")({
  component: DashboardIndex,
});
