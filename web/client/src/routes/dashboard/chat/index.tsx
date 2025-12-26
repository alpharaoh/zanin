import {
  useListThreads,
  useGetMessages,
  useSendMessage,
  useDeleteThread,
  useGetRecording,
  getGetMessagesQueryKey,
  getListThreadsQueryKey,
  type ChatThread,
} from "@/api";
import { cn } from "@/lib/utils";
import { formatRelativeDate } from "@/lib/format";
import { createFileRoute } from "@tanstack/react-router";
import { MessageSquareIcon, TrashIcon } from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChatMessages } from "@/components/chat/ChatMessages";
import { ChatInput } from "@/components/chat/ChatInput";
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
import { toast } from "sonner";

function ChatPage() {
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [deleteThreadId, setDeleteThreadId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: threadsData, isLoading: isLoadingThreads } = useListThreads();
  const threads = threadsData?.threads ?? [];

  // Auto-select the first (most recent) thread on load
  useEffect(() => {
    if (threads.length > 0 && !selectedThreadId) {
      setSelectedThreadId(threads[0].id);
    }
  }, [threads, selectedThreadId]);

  const selectedThread = threads.find((t) => t.id === selectedThreadId);

  // Get messages for selected thread
  const { data: messagesData } = useGetMessages(
    selectedThreadId ?? "",
    undefined,
    {
      query: {
        enabled: !!selectedThreadId,
      },
    }
  );

  // Get recording title if thread is scoped to a recording
  const { data: recording } = useGetRecording(
    selectedThread?.recordingId ?? "",
    {
      query: {
        enabled: !!selectedThread?.recordingId,
      },
    }
  );

  const sendMessage = useSendMessage();
  const deleteThread = useDeleteThread();

  const handleSend = useCallback(
    async (content: string) => {
      if (!selectedThreadId) {
        return;
      }

      const previousMessages = messagesData?.messages ?? [];
      const tempUserMessage = {
        id: `temp-user-${Date.now()}`,
        threadId: selectedThreadId,
        role: "user" as const,
        content,
        metadata: null,
        createdAt: new Date().toISOString(),
      };

      queryClient.setQueryData(getGetMessagesQueryKey(selectedThreadId), {
        messages: [...previousMessages, tempUserMessage],
        count: previousMessages.length + 1,
      });

      try {
        const result = await sendMessage.mutateAsync({
          threadId: selectedThreadId,
          data: { content },
        });

        queryClient.setQueryData(getGetMessagesQueryKey(selectedThreadId), {
          messages: [
            ...previousMessages,
            result.userMessage,
            result.assistantMessage,
          ],
          count: previousMessages.length + 2,
        });

        // Refresh threads list to update lastActivityAt
        queryClient.invalidateQueries({ queryKey: getListThreadsQueryKey() });
      } catch (error) {
        queryClient.setQueryData(getGetMessagesQueryKey(selectedThreadId), {
          messages: previousMessages,
          count: previousMessages.length,
        });
        console.error("Failed to send message:", error);
      }
    },
    [selectedThreadId, messagesData?.messages, queryClient, sendMessage]
  );

  const handleDelete = useCallback(async () => {
    if (!deleteThreadId) {
      return;
    }

    try {
      await deleteThread.mutateAsync({ threadId: deleteThreadId });
      queryClient.invalidateQueries({ queryKey: getListThreadsQueryKey() });
      if (selectedThreadId === deleteThreadId) {
        setSelectedThreadId(null);
      }
      setDeleteThreadId(null);
      toast.success("Thread deleted");
    } catch (error) {
      console.error("Failed to delete thread:", error);
      toast.error("Failed to delete thread");
    }
  }, [deleteThreadId, deleteThread, queryClient, selectedThreadId]);

  const messages = messagesData?.messages ?? [];

  return (
    <div
      className="flex w-full gap-6"
      style={{ height: "calc(100vh - 88px)" }}
    >
      {/* Left: Thread List */}
      <div className="w-80 shrink-0 overflow-hidden border border-border">
        <div className="flex h-10 items-center justify-between border-b border-border bg-card/80 px-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">{">"}</span>
            <span className="text-xs">threads</span>
          </div>
          <span className="text-[10px] text-muted-foreground">
            {threads.length} total
          </span>
        </div>

        <div className="h-[calc(100%-40px)] overflow-y-auto">
          {isLoadingThreads ? (
            <ThreadListSkeleton />
          ) : threads.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center p-6 text-center">
              <MessageSquareIcon className="mb-2 size-8 text-muted-foreground/30" />
              <p className="text-xs text-muted-foreground">no threads yet</p>
              <p className="mt-1 text-[10px] text-muted-foreground/60">
                start chatting with Z.A.R.A
              </p>
            </div>
          ) : (
            threads.map((thread) => (
              <ThreadRow
                key={thread.id}
                thread={thread}
                isSelected={selectedThreadId === thread.id}
                onSelect={() => setSelectedThreadId(thread.id)}
                onDelete={() => setDeleteThreadId(thread.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Right: Chat Panel */}
      <div className="flex min-w-0 flex-1 flex-col border border-border">
        {/* Header */}
        <div className="flex h-10 items-center border-b border-border bg-card/80 px-3">
          <div className="flex items-center gap-1.5 overflow-hidden">
            <span className="text-xs text-muted-foreground">{">"}</span>
            {selectedThread ? (
              <div className="flex items-center gap-1.5 overflow-hidden">
                <span className="shrink-0 text-xs text-muted-foreground">
                  recordings
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  /
                </span>
                <span className="truncate text-xs">
                  {selectedThread.recordingId
                    ? recording?.title || "untitled"
                    : "all"}
                </span>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">
                select a thread
              </span>
            )}
          </div>
        </div>

        {/* Messages */}
        {selectedThread ? (
          <>
            <ChatMessages
              messages={messages}
              isLoading={sendMessage.isPending}
            />
            <ChatInput onSend={handleSend} />
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
            <MessageSquareIcon className="mb-3 size-12 text-muted-foreground/20" />
            <p className="text-xs text-muted-foreground">
              select a thread to continue chatting
            </p>
          </div>
        )}
      </div>

      {/* Delete Dialog */}
      <AlertDialog
        open={!!deleteThreadId}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteThreadId(null);
          }
        }}
      >
        <AlertDialogContent className="border border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">
              {">"} confirm_delete
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              this will permanently delete this thread and all messages.
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
              delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ThreadRow({
  thread,
  isSelected,
  onSelect,
  onDelete,
}: {
  thread: ChatThread;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const { data: recording } = useGetRecording(thread.recordingId ?? "", {
    query: {
      enabled: !!thread.recordingId,
    },
  });

  const title = thread.recordingId
    ? recording?.title || "untitled"
    : "all recordings";

  return (
    <div
      className={cn(
        "group flex cursor-pointer items-center justify-between border-b border-border px-3 py-3 transition-colors hover:bg-card/50",
        isSelected && "bg-primary/5"
      )}
      onClick={onSelect}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <MessageSquareIcon
            className={cn(
              "size-3.5 shrink-0",
              isSelected ? "text-primary" : "text-muted-foreground"
            )}
          />
          <span
            className={cn(
              "truncate text-xs",
              isSelected ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {title}
          </span>
        </div>
        <p className="mt-1 pl-5.5 text-[10px] text-muted-foreground/60">
          {formatRelativeDate(thread.lastActivityAt)}
        </p>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="ml-2 p-1 text-muted-foreground/50 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
      >
        <TrashIcon className="size-3.5" />
      </button>
    </div>
  );
}

function ThreadListSkeleton() {
  return (
    <div className="space-y-0">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="border-b border-border px-3 py-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="mt-1.5 h-3 w-1/3" />
        </div>
      ))}
    </div>
  );
}

export const Route = createFileRoute("/dashboard/chat/")({
  component: ChatPage,
});
