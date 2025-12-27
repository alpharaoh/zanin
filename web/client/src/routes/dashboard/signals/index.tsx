import { useState, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  useListSignals,
  useGetSignalsStats,
  useGetAchievements,
  useCreateSignal,
  useUpdateSignal,
  useDeleteSignal,
  type Signal,
  type CreateSignalRequest,
  getListSignalsQueryKey,
  getGetSignalsStatsQueryKey,
} from "@/api";
import { SignalCard } from "@/components/signals/SignalCard";
import { SignalForm } from "@/components/signals/SignalForm";
import { AchievementGrid } from "@/components/signals/AchievementBadge";
import { StreakIndicator } from "@/components/signals/StreakIndicator";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
import { PlusIcon, Loader2Icon, TrophyIcon } from "lucide-react";
import { cn } from "@/lib/utils";

function SignalsPage() {
  const queryClient = useQueryClient();

  // State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSignal, setEditingSignal] = useState<Signal | undefined>();
  const [deletingSignal, setDeletingSignal] = useState<Signal | null>(null);

  // Queries
  const { data: signalsData, isLoading: signalsLoading } = useListSignals({
    limit: 100,
  });
  const { data: statsData, isLoading: statsLoading } = useGetSignalsStats();
  const { data: achievementsData, isLoading: achievementsLoading } =
    useGetAchievements();

  // Mutations
  const createMutation = useCreateSignal();
  const updateMutation = useUpdateSignal();
  const deleteMutation = useDeleteSignal();

  const invalidateQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: getListSignalsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetSignalsStatsQueryKey() });
  }, [queryClient]);

  // Handlers
  const handleCreateOrUpdate = useCallback(
    async (data: CreateSignalRequest) => {
      try {
        if (editingSignal) {
          await updateMutation.mutateAsync({
            signalId: editingSignal.id,
            data,
          });
          toast.success("Signal updated");
        } else {
          await createMutation.mutateAsync({ data });
          toast.success("Signal created");
        }
        invalidateQueries();
        setIsFormOpen(false);
        setEditingSignal(undefined);
      } catch {
        toast.error(editingSignal ? "Failed to update signal" : "Failed to create signal");
      }
    },
    [editingSignal, createMutation, updateMutation, invalidateQueries]
  );

  const handleEdit = useCallback((signal: Signal) => {
    setEditingSignal(signal);
    setIsFormOpen(true);
  }, []);

  const handleToggleActive = useCallback(
    async (signal: Signal) => {
      try {
        await updateMutation.mutateAsync({
          signalId: signal.id,
          data: { isActive: !signal.isActive },
        });
        invalidateQueries();
        toast.success(signal.isActive ? "Signal paused" : "Signal resumed");
      } catch {
        toast.error("Failed to update signal");
      }
    },
    [updateMutation, invalidateQueries]
  );

  const handleDelete = useCallback(async () => {
    if (!deletingSignal) {
      return;
    }

    try {
      await deleteMutation.mutateAsync({ signalId: deletingSignal.id });
      invalidateQueries();
      setDeletingSignal(null);
      toast.success("Signal deleted");
    } catch {
      toast.error("Failed to delete signal");
    }
  }, [deletingSignal, deleteMutation, invalidateQueries]);

  const signals = signalsData?.signals ?? [];
  const activeSignals = signals.filter((s) => s.isActive);
  const inactiveSignals = signals.filter((s) => !s.isActive);

  const isLoading = signalsLoading || statsLoading;

  if (isLoading) {
    return <SignalsSkeleton />;
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-muted-foreground">~/</span>
          <span className="text-primary">signals</span>
        </div>
        <Button onClick={() => setIsFormOpen(true)} size="sm">
          <PlusIcon className="mr-1.5 size-3.5" />
          new signal
        </Button>
      </div>

      {/* Stats Grid */}
      {statsData && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatBox
            label="total_points"
            value={
              <span
                className={cn(
                  "tabular-nums",
                  statsData.totalPoints > 0 && "text-emerald-500",
                  statsData.totalPoints < 0 && "text-red-500"
                )}
              >
                {statsData.totalPoints > 0 ? "+" : ""}
                {statsData.totalPoints}
              </span>
            }
          />
          <StatBox
            label="active_signals"
            value={<span className="tabular-nums">{statsData.activeSignals}</span>}
            extra={
              signals.length > statsData.activeSignals
                ? `${signals.length - statsData.activeSignals} paused`
                : undefined
            }
          />
          <StatBox
            label="best_streak"
            value={
              <StreakIndicator
                streak={statsData.bestCurrentStreak}
                longestStreak={statsData.longestEverStreak}
                size="lg"
              />
            }
            extra={
              statsData.longestEverStreak > statsData.bestCurrentStreak
                ? `record: ${statsData.longestEverStreak}`
                : undefined
            }
          />
          <StatBox
            label="achievements"
            value={
              <span className="tabular-nums">
                {statsData.achievementsUnlocked}/{statsData.totalAchievements}
              </span>
            }
            extra={
              statsData.totalEvaluations > 0
                ? `${statsData.overallSuccessRate}% success rate`
                : undefined
            }
          />
        </div>
      )}

      {/* Achievements Section */}
      {achievementsData && achievementsData.achievements.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <TrophyIcon className="size-3.5" />
            <span className="text-xs">{">"} achievements</span>
          </div>
          {achievementsLoading ? (
            <Skeleton className="h-12 w-full" />
          ) : (
            <AchievementGrid
              achievements={achievementsData.achievements}
              definitions={achievementsData.definitions}
            />
          )}
        </div>
      )}

      {/* Active Signals */}
      <div className="space-y-4">
        <span className="text-muted-foreground">{">"} active_signals</span>

        {activeSignals.length === 0 ? (
          <div className="border border-dashed border-border p-8 text-center">
            <p className="text-muted-foreground">// no active signals</p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              create a signal to start tracking behavior patterns
            </p>
            <Button
              onClick={() => setIsFormOpen(true)}
              variant="outline"
              size="sm"
              className="mt-4"
            >
              <PlusIcon className="mr-1.5 size-3.5" />
              create first signal
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {activeSignals.map((signal) => (
              <SignalCard
                key={signal.id}
                signal={signal}
                onEdit={handleEdit}
                onDelete={setDeletingSignal}
                onToggleActive={handleToggleActive}
              />
            ))}
          </div>
        )}
      </div>

      {/* Inactive Signals */}
      {inactiveSignals.length > 0 && (
        <div className="space-y-4">
          <span className="text-muted-foreground/70">
            {">"} paused_signals
          </span>
          <div className="grid gap-4 sm:grid-cols-2">
            {inactiveSignals.map((signal) => (
              <SignalCard
                key={signal.id}
                signal={signal}
                onEdit={handleEdit}
                onDelete={setDeletingSignal}
                onToggleActive={handleToggleActive}
              />
            ))}
          </div>
        </div>
      )}

      {/* ASCII decoration */}
      <div className="text-center text-xs text-muted-foreground/30">
        ═══════════════════════════════════════════
      </div>

      {/* Create/Edit Form */}
      <SignalForm
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) {
            setEditingSignal(undefined);
          }
        }}
        signal={editingSignal}
        onSubmit={handleCreateOrUpdate}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingSignal}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingSignal(null);
          }
        }}
      >
        <AlertDialogContent className="border border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">
              {">"} confirm_delete
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              this will permanently delete "{deletingSignal?.name}" and all its
              evaluation history. this action cannot be undone.
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
                <Loader2Icon className="mr-1.5 size-3 animate-spin" />
              )}
              delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface StatBoxProps {
  label: string;
  value: React.ReactNode;
  extra?: string;
}

function StatBox({ label, value, extra }: StatBoxProps) {
  return (
    <div className="border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-2 text-xl text-foreground">{value}</div>
      {extra && (
        <p className="mt-1 text-xs text-muted-foreground">{extra}</p>
      )}
    </div>
  );
}

function SignalsSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-8 w-28" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <div className="space-y-4">
        <Skeleton className="h-4 w-32" />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/dashboard/signals/")({
  component: SignalsPage,
});
