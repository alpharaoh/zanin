import { useDeleteProfile, useEnroll, useGetProfile } from "@/api";
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
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatRelativeDate } from "@/lib/format";
import { useQueryClient } from "@tanstack/react-query";
import { CheckIcon, Loader2Icon, TrashIcon, UploadIcon } from "lucide-react";
import { useCallback, useRef, useState } from "react";

interface VoiceProfileProps {
  className?: string;
}

export function VoiceProfile({ className }: VoiceProfileProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const { data: profile, isLoading: isLoadingProfile } = useGetProfile();
  const enrollMutation = useEnroll();
  const deleteMutation = useDeleteProfile();

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      if (!file.type.startsWith("audio/")) {
        return;
      }

      setIsUploading(true);
      setUploadProgress(0);

      try {
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => Math.min(prev + 10, 90));
        }, 200);

        await enrollMutation.mutateAsync({ data: { audio: file } });

        clearInterval(progressInterval);
        setUploadProgress(100);

        queryClient.invalidateQueries({ queryKey: ["/v1/sid/profile"] });
      } catch (error) {
        console.error("Failed to enroll voice profile:", error);
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [enrollMutation, queryClient]
  );

  const handleDelete = useCallback(async () => {
    try {
      await deleteMutation.mutateAsync();
      queryClient.invalidateQueries({ queryKey: ["/v1/sid/profile"] });
      setShowDeleteDialog(false);
    } catch (error) {
      console.error("Failed to delete voice profile:", error);
    }
  }, [deleteMutation, queryClient]);

  const hasProfile = profile?.exists;

  return (
    <div className={cn("border border-border", className)}>
      {/* Header */}
      <div className="border-b border-border bg-card px-4 py-3">
        <p className="text-xs text-muted-foreground">{">"} voice_profile</p>
      </div>

      {/* Content */}
      <div className="p-4">
        {isLoadingProfile ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        ) : hasProfile ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex size-8 items-center justify-center border border-emerald-500/50 bg-emerald-500/10">
                <CheckIcon className="size-4 text-emerald-500" />
              </span>
              <div>
                <p className="text-sm">enrolled</p>
                {profile.created_at && (
                  <p className="text-xs text-muted-foreground">
                    {formatRelativeDate(profile.created_at)}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => setShowDeleteDialog(true)}
              disabled={deleteMutation.isPending}
              className="border border-border p-2 text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive"
            >
              {deleteMutation.isPending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <TrashIcon className="size-4" />
              )}
            </button>
          </div>
        ) : isUploading ? (
          <div className="space-y-3">
            <Progress value={uploadProgress} className="h-1" />
            <p className="text-xs text-muted-foreground">processing...</p>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full items-center gap-3 border border-dashed border-border p-4 text-left transition-colors hover:border-primary/50"
          >
            <span className="flex size-8 items-center justify-center border border-border">
              <UploadIcon className="size-4 text-muted-foreground" />
            </span>
            <div>
              <p className="text-sm">upload voice sample</p>
              <p className="text-xs text-muted-foreground">
                30+ seconds of clear speech
              </p>
            </div>
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="border border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">
              {">"} confirm_delete
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              remove voice profile? this will affect speaker identification in future recordings.
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
              remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
