import type {
  Thread,
  RunInput,
  RunOutput,
  ThreadState,
  Assistant,
  Message,
} from "./types";

const LANGGRAPH_URL = process.env.LANGGRAPH_URL || "http://localhost:2024";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${LANGGRAPH_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`LangGraph API error: ${response.status} - ${text}`);
  }

  return response.json();
}

const LangGraphService = {
  /**
   * List all assistants (graphs) available
   */
  listAssistants: async (): Promise<Assistant[]> => {
    return request<Assistant[]>("/assistants/search", {
      method: "POST",
      body: JSON.stringify({}),
    });
  },

  /**
   * Create a new thread
   */
  createThread: async (metadata?: Record<string, unknown>): Promise<Thread> => {
    return request<Thread>("/threads", {
      method: "POST",
      body: JSON.stringify({ metadata }),
    });
  },

  /**
   * Get a thread by ID
   */
  getThread: async (threadId: string): Promise<Thread> => {
    return request<Thread>(`/threads/${threadId}`);
  },

  /**
   * Delete a thread
   */
  deleteThread: async (threadId: string): Promise<void> => {
    await request(`/threads/${threadId}`, { method: "DELETE" });
  },

  /**
   * Get the current state of a thread
   */
  getThreadState: async (threadId: string): Promise<ThreadState> => {
    return request<ThreadState>(`/threads/${threadId}/state`);
  },

  /**
   * Run a graph on a thread and wait for completion
   */
  run: async (options: {
    threadId: string;
    assistantId: string;
    input: RunInput;
  }): Promise<RunOutput> => {
    const { threadId, assistantId, input } = options;

    return request<RunOutput>(`/threads/${threadId}/runs/wait`, {
      method: "POST",
      body: JSON.stringify({
        assistant_id: assistantId,
        input,
      }),
    });
  },

  /**
   * Run a graph and stream the response
   */
  stream: async function* (options: {
    threadId: string;
    assistantId: string;
    input: RunInput;
  }): AsyncGenerator<{ event: string; data: unknown }> {
    const { threadId, assistantId, input } = options;

    const response = await fetch(
      `${LANGGRAPH_URL}/threads/${threadId}/runs/stream`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assistant_id: assistantId,
          input,
          stream_mode: "events",
        }),
      },
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`LangGraph API error: ${response.status} - ${text}`);
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
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") {
            return;
          }
          try {
            const parsed = JSON.parse(data);
            yield parsed;
          } catch {
            // Skip malformed JSON
          }
        }
      }
    }
  },

  /**
   * Convenience method: Create thread, run graph, return result
   */
  invoke: async (options: {
    assistantId: string;
    input: RunInput;
    metadata?: Record<string, unknown>;
  }): Promise<{ threadId: string; output: RunOutput }> => {
    const { assistantId, input, metadata } = options;

    const thread = await LangGraphService.createThread(metadata);
    const output = await LangGraphService.run({
      threadId: thread.thread_id,
      assistantId,
      input,
    });

    return { threadId: thread.thread_id, output };
  },

  /**
   * Convenience method: Send a message and get a response
   */
  chat: async (options: {
    assistantId: string;
    message: string;
    threadId?: string;
  }): Promise<{ threadId: string; response: string }> => {
    const { assistantId, message, threadId } = options;

    let thread: Thread;
    if (threadId) {
      thread = await LangGraphService.getThread(threadId);
    } else {
      thread = await LangGraphService.createThread();
    }

    const output = await LangGraphService.run({
      threadId: thread.thread_id,
      assistantId,
      input: {
        messages: [{ role: "user", content: message }],
      },
    });

    const messages = output.messages as Message[] | undefined;
    const lastMessage = messages?.[messages.length - 1];
    const response = lastMessage?.content || "";

    return { threadId: thread.thread_id, response };
  },
};

export default LangGraphService;
