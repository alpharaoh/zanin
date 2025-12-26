import { useEffect, useRef } from "react";
import type { ChatMessage as ChatMessageType } from "@/api";
import { ChatMessage } from "./ChatMessage";
import { Spinner } from "@/components/ui/spinner";

interface ChatMessagesProps {
  messages: ChatMessageType[];
  isLoading?: boolean;
}

export function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  if (messages.length === 0 && !isLoading) {
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

      {isLoading && (
        <div className="border border-border bg-gradient-to-b from-card to-background p-3">
          <div className="pointer-events-none absolute inset-0 opacity-10 grid-pattern" />
          <Spinner label="thinking" />
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
