import { useState, useCallback } from "react";
import {
  useListApiKeys,
  useCreateApiKey,
  useDeleteApiKey,
  getListApiKeysQueryKey,
} from "@/api";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  KeyIcon,
  PlusIcon,
  TrashIcon,
  CopyIcon,
  CheckIcon,
} from "lucide-react";
import { toast } from "sonner";
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

interface ApiKeysProps {
  className?: string;
}

export function ApiKeys({ className }: ApiKeysProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [deleteKeyId, setDeleteKeyId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useListApiKeys();
  const createApiKey = useCreateApiKey();
  const deleteApiKey = useDeleteApiKey();

  const apiKeys = data?.apiKeys ?? [];

  const handleCreate = useCallback(async () => {
    if (!newKeyName.trim()) {
      toast.error("Please enter a name for the API key");
      return;
    }

    try {
      const result = await createApiKey.mutateAsync({
        data: { name: newKeyName.trim() },
      });
      setCreatedKey(result.key);
      setNewKeyName("");
      setIsCreating(false);
      queryClient.invalidateQueries({ queryKey: getListApiKeysQueryKey() });
      toast.success("API key created");
    } catch {
      toast.error("Failed to create API key");
    }
  }, [newKeyName, createApiKey, queryClient]);

  const handleDelete = useCallback(async () => {
    if (!deleteKeyId) {
      return;
    }

    try {
      await deleteApiKey.mutateAsync({ keyId: deleteKeyId });
      queryClient.invalidateQueries({ queryKey: getListApiKeysQueryKey() });
      setDeleteKeyId(null);
      toast.success("API key deleted");
    } catch {
      toast.error("Failed to delete API key");
    }
  }, [deleteKeyId, deleteApiKey, queryClient]);

  const handleCopyKey = useCallback(async () => {
    if (!createdKey) {
      return;
    }

    try {
      await navigator.clipboard.writeText(createdKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
      toast.success("API key copied to clipboard");
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  }, [createdKey]);

  if (isLoading) {
    return <ApiKeysSkeleton className={className} />;
  }

  return (
    <div className={cn("border border-border", className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
        <p className="text-xs text-muted-foreground">{">"} api_keys</p>
        <Button
          variant="ghost"
          size="xs"
          onClick={() => setIsCreating(true)}
        >
          <PlusIcon className="size-3" />
          new
        </Button>
      </div>

      {/* Created key banner */}
      {createdKey && (
        <div className="border-b border-primary/30 bg-primary/5 p-4">
          <div className="mb-2 flex items-center gap-2">
            <KeyIcon className="size-3.5 text-primary" />
            <p className="text-xs text-primary">new api key created</p>
          </div>
          <p className="mb-2 text-[10px] text-muted-foreground">
            copy this key now. you won't be able to see it again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded bg-card px-2 py-1 font-mono text-xs">
              {createdKey}
            </code>
            <Button
              variant="outline"
              size="icon-xs"
              onClick={handleCopyKey}
            >
              {copiedKey ? (
                <CheckIcon className="size-3 text-primary" />
              ) : (
                <CopyIcon className="size-3" />
              )}
            </Button>
          </div>
          <Button
            variant="link"
            size="xs"
            className="mt-2 h-auto p-0 text-[10px] text-muted-foreground"
            onClick={() => setCreatedKey(null)}
          >
            dismiss
          </Button>
        </div>
      )}

      {/* Create form */}
      {isCreating && (
        <div className="border-b border-border p-4">
          <Label className="mb-2 text-muted-foreground">key name</Label>
          <Input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="e.g., production-api"
            className="mb-3 font-mono"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleCreate();
              }
              if (e.key === "Escape") {
                setIsCreating(false);
                setNewKeyName("");
              }
            }}
          />
          <div className="flex gap-2">
            <Button
              size="xs"
              onClick={handleCreate}
              disabled={createApiKey.isPending}
            >
              {createApiKey.isPending ? "creating..." : "create"}
            </Button>
            <Button
              variant="outline"
              size="xs"
              onClick={() => {
                setIsCreating(false);
                setNewKeyName("");
              }}
            >
              cancel
            </Button>
          </div>
        </div>
      )}

      {/* Keys list */}
      <div className="divide-y divide-border">
        {apiKeys.length === 0 ? (
          <div className="p-4 text-center">
            <KeyIcon className="mx-auto mb-2 size-6 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">no api keys yet</p>
            <p className="mt-1 text-[10px] text-muted-foreground/60">
              create one to get started
            </p>
          </div>
        ) : (
          apiKeys.map((key) => (
            <div
              key={key.id}
              className="group flex items-center justify-between p-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <KeyIcon
                    className={cn(
                      "size-3.5 shrink-0",
                      key.enabled ? "text-primary" : "text-muted-foreground/50"
                    )}
                  />
                  <span className="truncate text-xs">
                    {key.name || "unnamed"}
                  </span>
                </div>
                <p className="mt-1 pl-5.5 font-mono text-[10px] text-muted-foreground">
                  {key.start}•••••••••
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setDeleteKeyId(key.id)}
                className="ml-2 text-muted-foreground/50 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
              >
                <TrashIcon className="size-3.5" />
              </Button>
            </div>
          ))
        )}
      </div>

      {/* Usage info */}
      <div className="border-t border-border bg-card/50 p-4">
        <p className="text-[10px] text-muted-foreground">
          use{" "}
          <code className="rounded bg-card px-1">
            Authorization: Bearer {"<key>"}
          </code>{" "}
          to authenticate api requests
        </p>
      </div>

      {/* Delete dialog */}
      <AlertDialog
        open={!!deleteKeyId}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteKeyId(null);
          }
        }}
      >
        <AlertDialogContent className="border border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">
              {">"} revoke_api_key
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              this will permanently revoke this api key. any applications using
              it will no longer be able to authenticate.
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
              revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ApiKeysSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("border border-border", className)}>
      <div className="border-b border-border bg-card px-4 py-3">
        <Skeleton className="h-3 w-20" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="p-4">
            <div className="flex items-center gap-2">
              <Skeleton className="size-3.5" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="mt-1.5 ml-5.5 h-3 w-40" />
          </div>
        ))}
      </div>
    </div>
  );
}
