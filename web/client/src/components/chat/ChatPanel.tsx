import { useCallback, useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListThreads,
  useCreateThread,
  useGetMessages,
  useSendMessage,
  useGetRecording,
  getGetMessagesQueryKey,
  getListThreadsQueryKey,
  type ChatMessage,
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

  // Local state for the active thread - this is the source of truth
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

  // Optimistic messages shown before server responds
  const [optimisticMessages, setOptimisticMessages] = useState<ChatMessage[]>([]);

  // Fetch recording details if we have a recordingId
  const { data: recording } = useGetRecording(recordingId ?? "", {
    query: {
      enabled: !!recordingId,
    },
  });

  // List threads for this scope (get most recent one)
  const threadsQuery = useListThreads({ recordingId, limit: 1 });
  const latestThread = threadsQuery.data?.threads?.[0];

  // Set active thread from query on initial load or when recordingId changes
  useEffect(() => {
    if (latestThread && !activeThreadId) {
      setActiveThreadId(latestThread.id);
    }
  }, [latestThread, activeThreadId]);

  // Reset when recordingId changes
  useEffect(() => {
    setActiveThreadId(null);
    setOptimisticMessages([]);
  }, [recordingId]);

  // Create thread mutation
  const createThread = useCreateThread();

  // Get messages for active thread
  const messagesQuery = useGetMessages(
    activeThreadId ?? "",
    undefined,
    {
      query: {
        enabled: !!activeThreadId,
      },
    }
  );

  // Send message mutation
  const sendMessage = useSendMessage();

  // Combine server messages with optimistic messages
  const serverMessages = messagesQuery.data?.messages ?? [];
  const messages = optimisticMessages.length > 0 ? optimisticMessages : serverMessages;

  // Handle sending a message
  const handleSend = useCallback(
    async (content: string) => {
      const tempUserMessage: ChatMessage = {
        id: `temp-user-${Date.now()}`,
        threadId: activeThreadId ?? "temp",
        role: "user",
        content,
        metadata: null,
        createdAt: new Date().toISOString(),
      };

      // If no active thread, create one first
      if (!activeThreadId) {
        // Show optimistic message immediately
        setOptimisticMessages([tempUserMessage]);

        try {
          // Create thread
          const result = await createThread.mutateAsync({
            data: { recordingId },
          });
          const newThread = result.thread;

          // Update active thread
          setActiveThreadId(newThread.id);

          // Send message
          const sendResult = await sendMessage.mutateAsync({
            threadId: newThread.id,
            data: { content },
          });

          // Update caches
          queryClient.setQueryData(
            getListThreadsQueryKey({ recordingId, limit: 1 }),
            { threads: [newThread], count: 1 }
          );
          queryClient.setQueryData(
            getGetMessagesQueryKey(newThread.id),
            { messages: [sendResult.userMessage, sendResult.assistantMessage], count: 2 }
          );

          // Clear optimistic messages (server data will take over)
          setOptimisticMessages([]);
        } catch (error) {
          console.error("Failed to send message:", error);
          setOptimisticMessages([]);
        }
        return;
      }

      // Existing thread - optimistic update
      setOptimisticMessages([...serverMessages, tempUserMessage]);

      try {
        const result = await sendMessage.mutateAsync({
          threadId: activeThreadId,
          data: { content },
        });

        // Update cache with real messages
        queryClient.setQueryData(
          getGetMessagesQueryKey(activeThreadId),
          {
            messages: [...serverMessages, result.userMessage, result.assistantMessage],
            count: serverMessages.length + 2,
          }
        );

        // Clear optimistic messages
        setOptimisticMessages([]);
      } catch (error) {
        // Revert optimistic update
        setOptimisticMessages([]);
        console.error("Failed to send message:", error);
      }
    },
    [activeThreadId, serverMessages, queryClient, sendMessage, createThread, recordingId]
  );

  // Handle starting a new thread
  const handleNewThread = useCallback(() => {
    setActiveThreadId(null);
    setOptimisticMessages([]);
  }, []);

  const isInitializing = threadsQuery.isLoading && !activeThreadId;

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
        disabled={isInitializing}
      />
    </div>
  );
}
