import { cn } from "@/lib/utils";
import type { ChatMessage as ChatMessageType } from "@/api";
import { ToolCallCard } from "./ToolCallCard";
import type { ToolCall } from "@/hooks/useStreamChat";

interface ChatMessageProps {
  message: ChatMessageType;
  toolCalls?: ToolCall[];
  isStreaming?: boolean;
}

export function ChatMessage({ message, toolCalls, isStreaming }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "relative border border-border p-3",
        isUser ? "bg-card/50" : "bg-gradient-to-b from-card to-background"
      )}
    >
      {/* Grid pattern for assistant */}
      {!isUser && (
        <div className="pointer-events-none absolute inset-0 opacity-10 grid-pattern" />
      )}

      {/* Role indicator */}
      <div className="relative mb-2 flex items-center gap-2">
        <span
          className={cn(
            "size-1.5 rounded-full",
            isUser ? "bg-muted-foreground" : "bg-primary"
          )}
        />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {isUser ? "you" : "z.a.r.a"}
        </span>
      </div>

      {/* Tool calls */}
      {toolCalls && toolCalls.length > 0 && (
        <div className="relative mb-3 flex flex-col gap-1.5">
          {toolCalls.map((toolCall) => (
            <ToolCallCard key={toolCall.id} toolCall={toolCall} />
          ))}
        </div>
      )}

      {/* Content */}
      <p className="relative whitespace-pre-wrap text-xs leading-relaxed">
        {message.content}
        {isStreaming && (
          <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-primary" />
        )}
      </p>
    </div>
  );
}
