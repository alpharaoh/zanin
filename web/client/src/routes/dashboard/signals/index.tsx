import { useState, useCallback, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  useListSignals,
  useCreateSignal,
  useUpdateSignal,
  useDeleteSignal,
  type Signal,
  type CreateSignalRequest,
  getListSignalsQueryKey,
} from "@/api";
import { SignalRow, SignalListHeader } from "@/components/signals/SignalRow";
import { SignalForm } from "@/components/signals/SignalForm";
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
import { PlusIcon, Loader2Icon } from "lucide-react";

function SignalsPage() {
  const queryClient = useQueryClient();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSignal, setEditingSignal] = useState<Signal | undefined>();
  const [deletingSignal, setDeletingSignal] = useState<Signal | null>(null);

  const { data: signalsData, isLoading } = useListSignals({ limit: 100 });

  const createMutation = useCreateSignal();
  const updateMutation = useUpdateSignal();
  const deleteMutation = useDeleteSignal();

  const invalidateQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: getListSignalsQueryKey() });
  }, [queryClient]);

  // Sort signals: active first, then by creation date
  const sortedSignals = useMemo(() => {
    const signals = signalsData?.signals ?? [];
    return [...signals].sort((a, b) => {
      if (a.isActive !== b.isActive) {
        return a.isActive ? -1 : 1;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [signalsData?.signals]);

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
        toast.error(
          editingSignal ? "Failed to update signal" : "Failed to create signal"
        );
      }
    },
    [editingSignal, createMutation, updateMutation, invalidateQueries]
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

  if (isLoading) {
    return <SignalsSkeleton />;
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
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

      {/* Signals Table */}
      {sortedSignals.length === 0 ? (
        <div className="border border-dashed border-border p-8 text-center">
          <p className="text-muted-foreground">// no signals</p>
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
        <div className="border border-border">
          <SignalListHeader />
          {sortedSignals.map((signal) => (
            <SignalRow
              key={signal.id}
              signal={signal}
              onEdit={(s) => {
                setEditingSignal(s);
                setIsFormOpen(true);
              }}
              onDelete={setDeletingSignal}
            />
          ))}
        </div>
      )}

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
              permanently delete "{deletingSignal?.name}" and all evaluation
              history? this action cannot be undone.
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

function SignalsSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-8 w-28" />
      </div>
      <div className="border border-border">
        <div className="border-b border-border bg-card px-4 py-2">
          <Skeleton className="h-4 w-full" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="border-b border-border px-4 py-3 last:border-b-0"
          >
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export const Route = createFileRoute("/dashboard/signals/")({
  component: SignalsPage,
});
