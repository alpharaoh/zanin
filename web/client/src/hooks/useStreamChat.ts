import { useState, useCallback, useRef } from "react";
import { env } from "@zanin/env/client";
import type { ChatMessage } from "@/api";

export interface ToolCallRecording {
  id: string;
  title: string | null;
  createdAt: string;
  relevanceScore?: number;
  excerpts?: string[];
}

export interface ToolCallResult {
  name: string;
  count?: number;
  recordings?: ToolCallRecording[];
}

export interface ToolCall {
  id: string;
  name: string;
  status: "running" | "completed";
  result?: ToolCallResult;
}

interface StreamEvent {
  type:
    | "user_message"
    | "token"
    | "tool_start"
    | "tool_end"
    | "assistant_message"
    | "error"
    | "done";
  message?: ChatMessage;
  content?: string;
  toolCallId?: string;
  name?: string;
  result?: ToolCallResult;
}

interface UseStreamChatOptions {
  onUserMessage?: (message: ChatMessage) => void;
  onAssistantMessage?: (message: ChatMessage) => void;
  onError?: (error: string) => void;
}

export function useStreamChat(options: UseStreamChatOptions = {}) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (threadId: string, content: string) => {
      // Reset state
      setIsStreaming(true);
      setStreamingContent("");
      setToolCalls([]);
      setError(null);

      // Create abort controller for cancellation
      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch(
          `${env.PUBLIC_SERVER_BASE_URL}/api/v1/chat/threads/${threadId}/stream`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({ content }),
            signal: abortControllerRef.current.signal,
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to send message");
        }

        if (!response.body) {
          throw new Error("No response body");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });

          // Parse SSE events from buffer
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") {
                continue;
              }

              try {
                const event: StreamEvent = JSON.parse(data);

                switch (event.type) {
                  case "user_message":
                    if (event.message) {
                      options.onUserMessage?.(event.message);
                    }
                    break;

                  case "token":
                    if (event.content) {
                      setStreamingContent((prev) => prev + event.content);
                    }
                    break;

                  case "tool_start":
                    if (event.toolCallId && event.name) {
                      setToolCalls((prev) => [
                        ...prev,
                        {
                          id: event.toolCallId!,
                          name: event.name!,
                          status: "running",
                        },
                      ]);
                    }
                    break;

                  case "tool_end":
                    if (event.toolCallId) {
                      setToolCalls((prev) =>
                        prev.map((tc) =>
                          tc.id === event.toolCallId
                            ? {
                                ...tc,
                                status: "completed" as const,
                                result: event.result,
                              }
                            : tc
                        )
                      );
                    }
                    break;

                  case "assistant_message":
                    if (event.message) {
                      options.onAssistantMessage?.(event.message);
                    }
                    break;

                  case "error":
                    setError(event.message?.content || "Unknown error");
                    options.onError?.(
                      event.message?.content || "Unknown error"
                    );
                    break;

                  case "done":
                    // Stream completed
                    break;
                }
              } catch (e) {
                console.error("Failed to parse SSE event:", e, data);
              }
            }
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          // Request was cancelled
          return;
        }
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        options.onError?.(errorMessage);
      } finally {
        setIsStreaming(false);
        setStreamingContent("");
        setToolCalls([]);
        abortControllerRef.current = null;
      }
    },
    [options]
  );

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  return {
    sendMessage,
    cancel,
    isStreaming,
    streamingContent,
    toolCalls,
    error,
  };
}
