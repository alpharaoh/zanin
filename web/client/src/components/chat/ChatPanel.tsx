import { useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetOrCreateThread,
  useGetMessages,
  useSendMessage,
  useDeleteThread,
  useGetRecording,
  getGetMessagesQueryKey,
  type ChatThread,
} from "@/api";
import { cn } from "@/lib/utils";
import { ChatHeader } from "./ChatHeader";
import { ChatMessages } from "./ChatMessages";
import { ChatInput } from "./ChatInput";

interface ChatPanelProps {
  recordingId?: string;
  className?: string;
}

export function ChatPanel({
  recordingId,
  className,
}: ChatPanelProps) {
  const queryClient = useQueryClient();

  // Fetch recording details if we have a recordingId
  const { data: recording } = useGetRecording(recordingId ?? "", {
    query: {
      enabled: !!recordingId,
    },
  });

  // Get or create thread mutation
  const getOrCreateThread = useGetOrCreateThread();
  const thread = getOrCreateThread.data?.thread as ChatThread | undefined;

  // Get messages query (only when we have a thread)
  const messagesQuery = useGetMessages(
    thread?.id ?? "",
    undefined,
    {
      query: {
        enabled: !!thread?.id,
        refetchInterval: false,
      },
    }
  );

  // Send message mutation
  const sendMessage = useSendMessage();

  // Delete thread mutation
  const deleteThread = useDeleteThread();

  // Initialize/switch thread when recordingId changes
  useEffect(() => {
    getOrCreateThread.mutate({
      data: { recordingId },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordingId]);

  // Handle sending a message
  const handleSend = useCallback(
    async (content: string) => {
      if (!thread?.id) {
        return;
      }

      // Optimistically add user message to cache
      const previousMessages = messagesQuery.data?.messages ?? [];
      const tempUserMessage = {
        id: `temp-user-${Date.now()}`,
        threadId: thread.id,
        role: "user" as const,
        content,
        metadata: null,
        createdAt: new Date().toISOString(),
      };

      queryClient.setQueryData(
        getGetMessagesQueryKey(thread.id),
        {
          messages: [...previousMessages, tempUserMessage],
          count: previousMessages.length + 1,
        }
      );

      try {
        const result = await sendMessage.mutateAsync({
          threadId: thread.id,
          data: { content },
        });

        // Update cache with real messages
        queryClient.setQueryData(
          getGetMessagesQueryKey(thread.id),
          {
            messages: [
              ...previousMessages,
              result.userMessage,
              result.assistantMessage,
            ],
            count: previousMessages.length + 2,
          }
        );
      } catch (error) {
        // Revert optimistic update on error
        queryClient.setQueryData(
          getGetMessagesQueryKey(thread.id),
          {
            messages: previousMessages,
            count: previousMessages.length,
          }
        );
        console.error("Failed to send message:", error);
      }
    },
    [thread?.id, messagesQuery.data?.messages, queryClient, sendMessage]
  );

  // Handle clearing the thread
  const handleClearThread = useCallback(async () => {
    if (!thread?.id) {
      return;
    }

    try {
      await deleteThread.mutateAsync({ threadId: thread.id });
      // Create a new thread
      getOrCreateThread.mutate({
        data: { recordingId },
      });
    } catch (error) {
      console.error("Failed to clear thread:", error);
    }
  }, [thread?.id, deleteThread, getOrCreateThread, recordingId]);

  const messages = messagesQuery.data?.messages ?? [];
  const isLoading =
    getOrCreateThread.isPending ||
    sendMessage.isPending ||
    (messagesQuery.isLoading && !!thread?.id);

  return (
    <div
      className={cn(
        "flex h-full flex-col border-l border-border bg-gradient-to-b from-card/30 to-background",
        className
      )}
    >
      {/* Grid pattern background */}
      <div className="pointer-events-none absolute inset-0 opacity-5 grid-pattern" />

      <ChatHeader
        scope={recordingId ? "recording" : "all"}
        recordingTitle={recording?.title ?? undefined}
        onClearThread={handleClearThread}
        hasMessages={messages.length > 0}
      />

      <ChatMessages
        messages={messages}
        isLoading={sendMessage.isPending}
      />

      <ChatInput
        onSend={handleSend}
        disabled={isLoading || !thread?.id}
      />
    </div>
  );
}
