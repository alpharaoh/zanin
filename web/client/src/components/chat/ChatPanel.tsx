import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetOrCreateThread,
  useGetMessages,
  useSendMessage,
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
  const [isStartingNewThread, setIsStartingNewThread] = useState(false);

  // Fetch recording details if we have a recordingId
  const { data: recording } = useGetRecording(recordingId ?? "", {
    query: {
      enabled: !!recordingId,
    },
  });

  // Get or create thread mutation
  const getOrCreateThread = useGetOrCreateThread();
  const thread = getOrCreateThread.data?.thread as ChatThread | undefined;

  // Get messages query (only when we have a thread and not starting new)
  const messagesQuery = useGetMessages(
    thread?.id ?? "",
    undefined,
    {
      query: {
        enabled: !!thread?.id && !isStartingNewThread,
        refetchInterval: false,
      },
    }
  );

  // Send message mutation
  const sendMessage = useSendMessage();

  // Initialize/switch thread when recordingId changes
  useEffect(() => {
    setIsStartingNewThread(false);
    getOrCreateThread.mutate({
      data: { recordingId },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordingId]);

  // Handle sending a message
  const handleSend = useCallback(
    async (content: string) => {
      // If starting a new thread, create it first
      if (isStartingNewThread) {
        setIsStartingNewThread(false);

        // Create a new thread (forceNew to ensure we get a fresh thread)
        const result = await getOrCreateThread.mutateAsync({
          data: { recordingId, forceNew: true },
        });

        const newThread = result.thread;

        // Send message to the new thread
        try {
          const sendResult = await sendMessage.mutateAsync({
            threadId: newThread.id,
            data: { content },
          });

          // Set the messages in cache
          queryClient.setQueryData(
            getGetMessagesQueryKey(newThread.id),
            {
              messages: [sendResult.userMessage, sendResult.assistantMessage],
              count: 2,
            }
          );
        } catch (error) {
          console.error("Failed to send message:", error);
        }
        return;
      }

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
    [isStartingNewThread, thread?.id, messagesQuery.data?.messages, queryClient, sendMessage, getOrCreateThread, recordingId]
  );

  // Handle starting a new thread (just clears the view)
  const handleNewThread = useCallback(() => {
    setIsStartingNewThread(true);
  }, []);

  const messages = isStartingNewThread ? [] : (messagesQuery.data?.messages ?? []);
  const isInitializing =
    getOrCreateThread.isPending ||
    (messagesQuery.isLoading && !!thread?.id && !isStartingNewThread);

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
        onNewThread={handleNewThread}
        hasMessages={messages.length > 0}
      />

      <ChatMessages
        messages={messages}
        isLoading={sendMessage.isPending}
      />

      <ChatInput
        onSend={handleSend}
        disabled={isInitializing || (!thread?.id && !isStartingNewThread)}
      />
    </div>
  );
}
