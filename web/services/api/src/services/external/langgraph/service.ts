/**
 * LangGraph Service
 *
 * Calls the agents service directly via HTTP instead of using the LangGraph SDK.
 * This avoids the need for the full LangGraph Platform (Redis, Postgres, licensing).
 *
 * Thread management is handled by our own database (chat_threads table).
 */

const LANGGRAPH_URL = process.env.LANGGRAPH_URL || "http://localhost:3001";

export interface Assistant {
  assistant_id: string;
  graph_id: string;
  name: string;
  created_at: string;
  updated_at: string;
  metadata: Record<string, unknown>;
}

export interface Thread {
  thread_id: string;
  created_at: string;
  updated_at: string;
  metadata: Record<string, unknown>;
}

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface StreamEvent {
  event: string;
  data: unknown;
}

const LangGraphService = {
  /**
   * List all available assistants
   * Since we use a simple server, we return a hardcoded list
   */
  listAssistants: async (): Promise<Assistant[]> => {
    return [
      {
        assistant_id: "recordings",
        graph_id: "recordings",
        name: "Recordings Query Assistant",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {},
      },
    ];
  },

  /**
   * Create a new thread
   * Since we manage threads in our own DB, this just generates an ID
   */
  createThread: async (metadata?: Record<string, unknown>): Promise<Thread> => {
    const threadId = crypto.randomUUID();
    return {
      thread_id: threadId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: metadata || {},
    };
  },

  /**
   * Get a thread by ID
   * Thread data is stored in our own DB, so this is a no-op
   */
  getThread: async (threadId: string): Promise<Thread> => {
    return {
      thread_id: threadId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: {},
    };
  },

  /**
   * Delete a thread
   * Thread deletion is handled by our own DB
   */
  deleteThread: async (_threadId: string): Promise<void> => {
    // No-op - thread deletion handled by ChatService
  },

  /**
   * Run a graph and wait for completion
   */
  run: async (options: {
    threadId: string;
    assistantId: string;
    input: Record<string, unknown>;
  }): Promise<Record<string, unknown>> => {
    const { input } = options;

    const response = await fetch(`${LANGGRAPH_URL}/invoke`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input,
        config: {},
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`LangGraph invoke failed: ${error}`);
    }

    return response.json();
  },

  /**
   * Stream a graph run
   * Returns an async iterable of events matching the LangGraph SDK format
   */
  stream: (options: {
    threadId: string;
    assistantId: string;
    input: Record<string, unknown>;
  }): AsyncIterable<StreamEvent> => {
    const { input } = options;

    return {
      async *[Symbol.asyncIterator]() {
        const response = await fetch(`${LANGGRAPH_URL}/stream`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            input,
            config: {},
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`LangGraph stream failed: ${error}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response body");
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });

          // Parse SSE events (data: {...}\n\n format)
          const events = buffer.split("\n\n");
          buffer = events.pop() || ""; // Keep incomplete event in buffer

          for (const eventStr of events) {
            const trimmed = eventStr.trim();
            if (!trimmed) {
              continue;
            }

            // Parse "data: {...}" format
            if (trimmed.startsWith("data: ")) {
              const jsonStr = trimmed.slice(6);
              try {
                const event = JSON.parse(jsonStr) as StreamEvent;
                yield event;
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }

        // Process any remaining buffer
        if (buffer.trim()) {
          const trimmed = buffer.trim();
          if (trimmed.startsWith("data: ")) {
            const jsonStr = trimmed.slice(6);
            try {
              const event = JSON.parse(jsonStr) as StreamEvent;
              yield event;
            } catch {
              // Skip invalid JSON
            }
          }
        }
      },
    };
  },

  /**
   * Convenience: Send a message and get a response
   */
  chat: async (options: {
    assistantId: string;
    message: string;
    threadId?: string;
  }): Promise<{ threadId: string; response: string }> => {
    const { message, threadId } = options;

    const actualThreadId = threadId || crypto.randomUUID();

    const result = await LangGraphService.run({
      threadId: actualThreadId,
      assistantId: "recordings",
      input: {
        messages: [{ role: "user", content: message }],
      },
    });

    const messages = (result as { messages?: Message[] }).messages;
    const lastMessage = messages?.[messages.length - 1];
    const response =
      typeof lastMessage?.content === "string" ? lastMessage.content : "";

    return { threadId: actualThreadId, response };
  },
};

export default LangGraphService;
