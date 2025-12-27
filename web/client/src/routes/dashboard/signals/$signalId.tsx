import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  useGetSignal,
  useGetSignalEvaluations,
  useUpdateSignal,
  useDeleteSignal,
  useGetAchievements,
  getListSignalsQueryKey,
  getGetSignalQueryKey,
} from "@/api";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { PointsChart } from "@/components/signals/PointsChart";
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
import {
  ArrowLeftIcon,
  TrashIcon,
  Loader2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PauseIcon,
  PlayIcon,
  PencilIcon,
  FlameIcon,
} from "lucide-react";
import { SignalForm } from "@/components/signals/SignalForm";
import type { CreateSignalRequest } from "@/api";
import { cn } from "@/lib/utils";
import { formatDistance } from "date-fns";
import { useState, useCallback } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

const PAGE_SIZE = 20;

function SignalDetailPage() {
  const { signalId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);

  const { data: signal, isLoading: signalLoading } = useGetSignal(signalId);
  const { data: evaluationsData, isLoading: evaluationsLoading } =
    useGetSignalEvaluations(signalId, {
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    });

  // Also fetch all evaluations for the chart
  const { data: allEvaluationsData } = useGetSignalEvaluations(signalId, {
    limit: 100,
  });

  // Fetch achievements for this signal
  const { data: achievementsData } = useGetAchievements();

  const updateMutation = useUpdateSignal();
  const deleteMutation = useDeleteSignal();

  const handleToggleActive = useCallback(async () => {
    if (!signal) {
      return;
    }

    try {
      await updateMutation.mutateAsync({
        signalId: signal.id,
        data: { isActive: !signal.isActive },
      });
      queryClient.invalidateQueries({ queryKey: getListSignalsQueryKey() });
      queryClient.invalidateQueries({
        queryKey: getGetSignalQueryKey(signalId),
      });
      toast.success(signal.isActive ? "Signal paused" : "Signal resumed");
    } catch {
      toast.error("Failed to update signal");
    }
  }, [signal, updateMutation, queryClient, signalId]);

  const handleEdit = useCallback(
    async (data: CreateSignalRequest) => {
      try {
        await updateMutation.mutateAsync({
          signalId,
          data,
        });
        queryClient.invalidateQueries({ queryKey: getListSignalsQueryKey() });
        queryClient.invalidateQueries({
          queryKey: getGetSignalQueryKey(signalId),
        });
        setShowEditForm(false);
        toast.success("Signal updated");
      } catch {
        toast.error("Failed to update signal");
      }
    },
    [signalId, updateMutation, queryClient]
  );

  const handleDelete = useCallback(async () => {
    try {
      await deleteMutation.mutateAsync({ signalId });
      queryClient.invalidateQueries({ queryKey: getListSignalsQueryKey() });
      toast.success("Signal deleted");
      navigate({ to: "/dashboard/signals" });
    } catch {
      toast.error("Failed to delete signal");
    }
  }, [signalId, deleteMutation, queryClient, navigate]);

  if (signalLoading) {
    return <SignalDetailSkeleton />;
  }

  if (!signal) {
    return <SignalNotFound />;
  }

  const evaluations = evaluationsData?.evaluations ?? [];
  const allEvaluations = allEvaluationsData?.evaluations ?? [];
  const totalCount = evaluationsData?.count ?? 0;

  // Filter achievements for this signal
  const signalAchievements = (achievementsData?.achievements ?? []).filter(
    (a) => a.signalId === signalId
  );
  const achievementDefinitions = achievementsData?.definitions ?? {};
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const hasNextPage = page < totalPages - 1;
  const hasPrevPage = page > 0;

  const totalEvaluations = signal.totalSuccesses + signal.totalFailures;
  const successRate =
    totalEvaluations > 0
      ? Math.round((signal.totalSuccesses / totalEvaluations) * 100)
      : null;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            to="/dashboard/signals"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
          >
            <ArrowLeftIcon className="size-3" />
            signals
          </Link>
          <h1 className="mt-2 truncate text-sm">
            <span className="text-muted-foreground">{">"} </span>
            {signal.name}
            {!signal.isActive && (
              <span className="ml-2 text-xs text-muted-foreground">
                [paused]
              </span>
            )}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {signal.description}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEditForm(true)}
            className="border border-border p-2 text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
          >
            <PencilIcon className="size-4" />
          </button>
          <button
            onClick={handleToggleActive}
            disabled={updateMutation.isPending}
            className="border border-border p-2 text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
          >
            {signal.isActive ? (
              <PauseIcon className="size-4" />
            ) : (
              <PlayIcon className="size-4" />
            )}
          </button>
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="border border-border p-2 text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive"
          >
            <TrashIcon className="size-4" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="border border-border p-4">
        <p className="mb-4 text-xs text-muted-foreground">{">"} stats</p>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
              points
            </dt>
            <dd
              className={cn(
                "mt-1 text-lg tabular-nums",
                signal.totalPoints > 0 && "text-emerald-500",
                signal.totalPoints < 0 && "text-red-500",
                signal.totalPoints === 0 && "text-muted-foreground"
              )}
            >
              {signal.totalPoints > 0 ? "+" : ""}
              {signal.totalPoints}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
              current_streak
            </dt>
            <dd
              className={cn(
                "mt-1 flex items-center gap-1.5 text-lg tabular-nums",
                signal.currentStreak >= 7 && "text-amber-500",
                signal.currentStreak >= 3 &&
                  signal.currentStreak < 7 &&
                  "text-amber-400/70",
                signal.currentStreak < 3 && "text-foreground"
              )}
            >
              {signal.currentStreak > 0 && <FlameIcon className="size-4" />}
              {signal.currentStreak}
              {signal.longestStreak > signal.currentStreak && (
                <span className="ml-1 text-xs text-muted-foreground">
                  (best: {signal.longestStreak})
                </span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
              success_rate
            </dt>
            <dd className="mt-1 text-lg tabular-nums">
              {successRate !== null ? `${successRate}%` : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
              evaluations
            </dt>
            <dd className="mt-1 text-lg tabular-nums">{totalCount}</dd>
          </div>
        </dl>
      </div>

      {/* Progression Chart */}
      <div className="border border-border pt-4 pr-4">
        <p className="mb-4 text-xs text-muted-foreground px-4">
          {">"} progression
        </p>
        <PointsChart evaluations={allEvaluations} />
      </div>

      {/* Goal & Failure Condition */}
      <div className="border border-border">
        <div className="grid gap-px border-b border-border bg-border sm:grid-cols-2">
          <div className="bg-background p-4">
            <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              goal
            </p>
            <p className="text-xs">{signal.goal}</p>
          </div>
          <div className="bg-background p-4">
            <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              failure_condition
            </p>
            <p className="text-xs">{signal.failureCondition}</p>
          </div>
        </div>
        <div className="grid gap-px bg-border sm:grid-cols-2">
          <div className="bg-background p-4">
            <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
              good_examples
            </p>
            {signal.goodExamples && signal.goodExamples.length > 0 ? (
              <ul className="space-y-1">
                {signal.goodExamples.map((ex, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs">
                    <span className="mt-1 size-1.5 shrink-0 bg-emerald-500" />
                    {ex}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground/50">None</p>
            )}
          </div>
          <div className="bg-background p-4">
            <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
              bad_examples
            </p>
            {signal.badExamples && signal.badExamples.length > 0 ? (
              <ul className="space-y-1">
                {signal.badExamples.map((ex, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs">
                    <span className="mt-1 size-1.5 shrink-0 bg-red-500" />
                    {ex}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground/50">None</p>
            )}
          </div>
        </div>
      </div>

      {/* Achievements */}
      {signalAchievements.length > 0 && (
        <div className="border border-border p-4">
          <p className="mb-4 text-xs text-muted-foreground">
            {">"} achievements
          </p>
          <div className="flex flex-wrap gap-3">
            {signalAchievements.map((achievement) => {
              const def = achievementDefinitions[achievement.achievementType];
              return (
                <Tooltip key={achievement.id} hoverable={false}>
                  <TooltipTrigger>
                    <div className="flex items-center gap-2.5 border border-border bg-card px-3 py-2">
                      <span className="text-base">{def?.icon || "🏅"}</span>
                      <div className="text-left">
                        <p className="text-xs font-medium">
                          {def?.name || achievement.achievementType}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatDistance(
                            new Date(achievement.unlockedAt),
                            new Date(),
                            {
                              addSuffix: true,
                            }
                          )}
                        </p>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p>{def?.description || "Achievement unlocked"}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>
      )}

      {/* Evaluations Table */}
      <div className="border border-border">
        <div className="border-b border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">{">"} evaluations</p>
        </div>

        {evaluationsLoading ? (
          <EvaluationsSkeleton />
        ) : evaluations.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-xs text-muted-foreground">
              // no evaluations yet
            </p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              evaluations appear when recordings are processed
            </p>
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 border-b border-border bg-card px-4 py-2 text-xs text-muted-foreground">
              <div className="col-span-1">result</div>
              <div className="col-span-5">reasoning</div>
              <div className="col-span-2">confidence</div>
              <div className="col-span-2 text-right">recording</div>
              <div className="col-span-2 text-right">date</div>
            </div>

            {/* Table Rows */}
            {evaluations.map((evaluation) => (
              <Tooltip key={evaluation.id} hoverable={false}>
                <TooltipTrigger className="w-full text-left">
                  <div className="grid grid-cols-12 gap-4 border-b border-border px-4 py-3 text-sm last:border-b-0 transition-colors hover:bg-muted/30">
                    {/* Result */}
                    <div className="col-span-1">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 text-xs",
                          evaluation.success
                            ? "text-emerald-500"
                            : "text-red-500"
                        )}
                      >
                        <span
                          className={cn(
                            "size-1.5 rounded-full",
                            evaluation.success ? "bg-emerald-500" : "bg-red-500"
                          )}
                        />
                        {evaluation.success ? "+1" : "-1"}
                      </span>
                    </div>

                    {/* Reasoning */}
                    <div className="col-span-5">
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {evaluation.reasoning}
                      </p>
                      {evaluation.evidence &&
                        evaluation.evidence.length > 0 && (
                          <p className="mt-1 text-[11px] italic text-muted-foreground/60 line-clamp-1">
                            "{evaluation.evidence[0]}"
                          </p>
                        )}
                    </div>

                    {/* Confidence */}
                    <div className="col-span-2">
                      <span
                        className={cn(
                          "text-xs",
                          evaluation.confidence === "high" &&
                            "text-emerald-500/80",
                          evaluation.confidence === "medium" &&
                            "text-amber-500/80",
                          evaluation.confidence === "low" && "text-red-400/80"
                        )}
                      >
                        {evaluation.confidence}
                      </span>
                    </div>

                    {/* Recording */}
                    <div className="col-span-2 text-right">
                      <Link
                        to="/dashboard/recordings/$recordingId"
                        params={{ recordingId: evaluation.recordingId }}
                        className="text-xs text-muted-foreground hover:text-primary"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {evaluation.recordingId.slice(0, 8)}...
                      </Link>
                    </div>

                    {/* Date */}
                    <div className="col-span-2 text-right text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistance(
                        new Date(evaluation.createdAt),
                        new Date(),
                        {
                          addSuffix: true,
                        }
                      )}
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  align="start"
                  className="max-w-md p-0"
                >
                  <div className="space-y-3 p-3">
                    {/* Header */}
                    <div className="flex items-center justify-between gap-4">
                      <span
                        className={cn(
                          "text-xs font-medium",
                          evaluation.success
                            ? "text-emerald-500"
                            : "text-red-500"
                        )}
                      >
                        {evaluation.success ? "Success" : "Failure"} (
                        {evaluation.pointsAwarded > 0 ? "+" : ""}
                        {evaluation.pointsAwarded} pts)
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        streak: {evaluation.streakAtEvaluation}
                      </span>
                    </div>

                    {/* Reasoning */}
                    <div>
                      <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                        reasoning
                      </p>
                      <p className="text-xs leading-relaxed">
                        {evaluation.reasoning}
                      </p>
                    </div>

                    {/* Confidence */}
                    <div>
                      <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                        confidence
                      </p>
                      <span
                        className={cn(
                          "text-xs",
                          evaluation.confidence === "high" &&
                            "text-emerald-500",
                          evaluation.confidence === "medium" &&
                            "text-amber-500",
                          evaluation.confidence === "low" && "text-red-400"
                        )}
                      >
                        {evaluation.confidence}
                      </span>
                    </div>

                    {/* Evidence */}
                    {evaluation.evidence && evaluation.evidence.length > 0 && (
                      <div>
                        <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                          evidence
                        </p>
                        <ul className="space-y-1">
                          {evaluation.evidence.map((e, i) => (
                            <li
                              key={i}
                              className="text-xs italic text-muted-foreground"
                            >
                              "{e}"
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border px-4 py-2 text-xs">
                <span className="text-muted-foreground">
                  {page * PAGE_SIZE + 1}–
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
                    {page + 1}/{totalPages}
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
            )}
          </>
        )}
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="border border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">
              {">"} confirm_delete
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              permanently delete "{signal.name}" and all evaluation history?
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

      {/* Edit Form */}
      <SignalForm
        open={showEditForm}
        onOpenChange={setShowEditForm}
        signal={signal}
        onSubmit={handleEdit}
        isSubmitting={updateMutation.isPending}
      />
    </div>
  );
}

function SignalDetailSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div>
        <Skeleton className="h-3 w-20" />
        <Skeleton className="mt-3 h-5 w-48" />
        <Skeleton className="mt-2 h-3 w-64" />
      </div>
      <Skeleton className="h-24" />
      <Skeleton className="h-32" />
      <Skeleton className="h-24" />
      <Skeleton className="h-64" />
    </div>
  );
}

function EvaluationsSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="border-b border-border px-4 py-3 last:border-b-0"
        >
          <Skeleton className="h-4 w-full" />
        </div>
      ))}
    </>
  );
}

function SignalNotFound() {
  return (
    <div className="border border-dashed border-border p-12 text-center">
      <p className="text-sm">// signal not found</p>
      <p className="mt-1 text-xs text-muted-foreground">
        this signal may have been deleted
      </p>
      <Link
        to="/dashboard/signals"
        className="mt-4 inline-flex items-center gap-1 text-xs text-primary hover:underline"
      >
        <ArrowLeftIcon className="size-3" />
        back to signals
      </Link>
    </div>
  );
}

export const Route = createFileRoute("/dashboard/signals/$signalId")({
  component: SignalDetailPage,
});
