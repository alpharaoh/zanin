import { useCallback, useState, useEffect, useRef } from "react";
import {
  useListThreads,
  useCreateThread,
  useGetMessages,
  useSendMessage,
  useGetRecording,
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
  // Local messages state - source of truth for display
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [isNewThreadMode, setIsNewThreadMode] = useState(false);
  const hasSyncedRef = useRef<string | null>(null);

  // Fetch recording details if we have a recordingId
  const { data: recording } = useGetRecording(recordingId ?? "", {
    query: {
      enabled: !!recordingId,
    },
  });

  // List threads to get the most recent one for this scope
  const threadsQuery = useListThreads({ recordingId, limit: 1 });
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
  const sendMessage = useSendMessage();

  // Handle sending a message
  const handleSend = useCallback(
    async (content: string) => {
      const tempUserMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        threadId: threadId ?? "temp",
        role: "user",
        content,
        metadata: null,
        createdAt: new Date().toISOString(),
      };

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
          setThreadId(currentThreadId);
          setIsNewThreadMode(false);
        } catch (error) {
          console.error("Failed to create thread:", error);
          setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id));
          return;
        }
      }

      // Send message
      try {
        const result = await sendMessage.mutateAsync({
          threadId: currentThreadId,
          data: { content },
        });

        // Replace temp message with real messages
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== tempUserMessage.id),
          result.userMessage,
          result.assistantMessage,
        ]);
      } catch (error) {
        console.error("Failed to send message:", error);
        setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id));
      }
    },
    [threadId, createThread, sendMessage, recordingId]
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
        isLoading={sendMessage.isPending}
      />

      <ChatInput
        onSend={handleSend}
        disabled={isInitializing}
      />
    </div>
  );
}
