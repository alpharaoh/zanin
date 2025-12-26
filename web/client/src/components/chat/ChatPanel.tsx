import { useCallback, useState, useEffect, useRef } from "react";
import {
  useListThreads,
  useCreateThread,
  useGetMessages,
  useGetRecording,
  type ChatMessage,
} from "@/api";
import { cn } from "@/lib/utils";
import { ChatHeader } from "./ChatHeader";
import { ChatMessages } from "./ChatMessages";
import { ChatInput } from "./ChatInput";
import { useStreamChat } from "@/hooks/useStreamChat";

interface ChatPanelProps {
  recordingId?: string;
  className?: string;
}

export function ChatPanel({
  recordingId,
  className,
}: ChatPanelProps) {
  // Local messages state - source of truth for display
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [isNewThreadMode, setIsNewThreadMode] = useState(false);
  const hasSyncedRef = useRef<string | null>(null);
  const tempUserMessageIdRef = useRef<string | null>(null);

  // Fetch recording details if we have a recordingId
  const { data: recording } = useGetRecording(recordingId ?? "", {
    query: {
      enabled: !!recordingId,
    },
  });

  // List threads to get the most recent one for this scope
  // If no recordingId, pass "null" to filter for threads where recordingId IS NULL
  const threadsQuery = useListThreads({
    recordingId: recordingId ?? "null",
    limit: 1,
  });
  const latestThread = threadsQuery.data?.threads?.[0];

  // Fetch messages for the current thread
  const messagesQuery = useGetMessages(
    threadId ?? "",
    undefined,
    {
      query: {
        enabled: !!threadId,
      },
    }
  );

  // Streaming chat hook
  const {
    sendMessage: streamMessage,
    isStreaming,
    streamingContent,
    toolCalls,
  } = useStreamChat({
    onUserMessage: (message) => {
      // Replace temp user message with real one
      if (tempUserMessageIdRef.current) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempUserMessageIdRef.current ? message : m
          )
        );
        tempUserMessageIdRef.current = null;
      }
    },
    onAssistantMessage: (message) => {
      // Add the final assistant message
      setMessages((prev) => [...prev, message]);
    },
    onError: (error) => {
      console.error("Stream error:", error);
      // Remove temp user message on error
      if (tempUserMessageIdRef.current) {
        setMessages((prev) =>
          prev.filter((m) => m.id !== tempUserMessageIdRef.current)
        );
        tempUserMessageIdRef.current = null;
      }
    },
  });

  // Reset on recordingId change
  useEffect(() => {
    setThreadId(null);
    setMessages([]);
    setIsNewThreadMode(false);
    hasSyncedRef.current = null;
  }, [recordingId]);

  // Auto-select latest thread on initial load (but not in new thread mode)
  useEffect(() => {
    if (latestThread && !threadId && !isNewThreadMode) {
      setThreadId(latestThread.id);
    }
  }, [latestThread, threadId, isNewThreadMode]);

  // Sync messages from server ONLY once per thread (on initial load)
  useEffect(() => {
    if (threadId && messagesQuery.data?.messages && hasSyncedRef.current !== threadId) {
      setMessages(messagesQuery.data.messages);
      hasSyncedRef.current = threadId;
    }
  }, [threadId, messagesQuery.data?.messages]);

  // Mutations
  const createThread = useCreateThread();

  // Handle sending a message
  const handleSend = useCallback(
    async (content: string) => {
      const tempId = `temp-${Date.now()}`;
      const tempUserMessage: ChatMessage = {
        id: tempId,
        threadId: threadId ?? "temp",
        role: "user",
        content,
        metadata: null,
        createdAt: new Date().toISOString(),
      };

      // Store temp ID for later replacement
      tempUserMessageIdRef.current = tempId;

      // Show user message immediately
      setMessages((prev) => [...prev, tempUserMessage]);

      let currentThreadId = threadId;

      // Create thread if needed
      if (!currentThreadId) {
        try {
          const result = await createThread.mutateAsync({
            data: { recordingId },
          });
          currentThreadId = result.thread.id;
          // Mark as synced BEFORE setting threadId to prevent the sync effect from running
          hasSyncedRef.current = currentThreadId;
          setThreadId(currentThreadId);
          setIsNewThreadMode(false);
        } catch (error) {
          console.error("Failed to create thread:", error);
          setMessages((prev) => prev.filter((m) => m.id !== tempId));
          tempUserMessageIdRef.current = null;
          return;
        }
      }

      // Stream message
      await streamMessage(currentThreadId, content);
    },
    [threadId, createThread, streamMessage, recordingId]
  );

  // Handle new thread - just clear messages and enter new thread mode
  const handleNewThread = useCallback(() => {
    setMessages([]);
    setThreadId(null);
    setIsNewThreadMode(true);
    hasSyncedRef.current = null;
  }, []);

  const isInitializing = threadsQuery.isLoading;

  return (
    <div
      className={cn(
        "flex h-full flex-col border-l border-border bg-gradient-to-b from-card/30 to-background",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 opacity-5 grid-pattern" />

      <ChatHeader
        scope={recordingId ? "recording" : "all"}
        recordingTitle={recording?.title ?? undefined}
        onNewThread={handleNewThread}
        hasMessages={messages.length > 0}
      />

      <ChatMessages
        messages={messages}
        streamingContent={streamingContent}
        streamingToolCalls={toolCalls}
        isStreaming={isStreaming}
      />

      <ChatInput
        onSend={handleSend}
        disabled={isInitializing || isStreaming}
      />
    </div>
  );
}
