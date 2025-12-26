import { useEffect, useRef } from "react";
import type { ChatMessage as ChatMessageType } from "@/api";
import { ChatMessage } from "./ChatMessage";
import type { ToolCall } from "@/hooks/useStreamChat";

interface ChatMessagesProps {
  messages: ChatMessageType[];
  streamingContent?: string;
  streamingToolCalls?: ToolCall[];
  isStreaming?: boolean;
}

export function ChatMessages({
  messages,
  streamingContent,
  streamingToolCalls,
  isStreaming,
}: ChatMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages or streaming content changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "instant" });
  }, [messages, streamingContent, isStreaming]);

  const showEmpty = messages.length === 0 && !isStreaming;

  if (showEmpty) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{">"} no_messages</p>
          <p className="text-[10px] text-muted-foreground/60">
            ask Z.A.R.A about your recordings
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3">
      {messages.map((message) => (
        <ChatMessage key={message.id} message={message} />
      ))}

      {/* Streaming message */}
      {isStreaming && (
        <ChatMessage
          message={{
            id: "streaming",
            threadId: "streaming",
            role: "assistant",
            content: streamingContent || "",
            metadata: null,
            createdAt: new Date().toISOString(),
          }}
          toolCalls={streamingToolCalls}
          isStreaming
        />
      )}

      <div ref={bottomRef} />
    </div>
  );
}
