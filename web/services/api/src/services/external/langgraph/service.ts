import { Client } from "@langchain/langgraph-sdk";

const LANGGRAPH_URL = process.env.LANGGRAPH_URL || "http://localhost:2024";

const client = new Client({ apiUrl: LANGGRAPH_URL });

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

const LangGraphService = {
  /**
   * List all available assistants
   */
  listAssistants: async (): Promise<Assistant[]> => {
    const assistants = await client.assistants.search();
    return assistants as unknown as Assistant[];
  },

  /**
   * Create a new thread
   */
  createThread: async (metadata?: Record<string, unknown>): Promise<Thread> => {
    const thread = await client.threads.create({ metadata });
    return thread as unknown as Thread;
  },

  /**
   * Get a thread by ID
   */
  getThread: async (threadId: string): Promise<Thread> => {
    const thread = await client.threads.get(threadId);
    return thread as unknown as Thread;
  },

  /**
   * Delete a thread
   */
  deleteThread: async (threadId: string): Promise<void> => {
    await client.threads.delete(threadId);
  },

  /**
   * Run a graph on a thread and wait for completion
   */
  run: async (options: {
    threadId: string;
    assistantId: string;
    input: Record<string, unknown>;
  }): Promise<Record<string, unknown>> => {
    const { threadId, assistantId, input } = options;

    const result = await client.runs.wait(threadId, assistantId, { input });
    return result as Record<string, unknown>;
  },

  /**
   * Stream a graph run
   */
  stream: (options: {
    threadId: string;
    assistantId: string;
    input: Record<string, unknown>;
  }): ReturnType<typeof client.runs.stream> => {
    const { threadId, assistantId, input } = options;
    return client.runs.stream(threadId, assistantId, {
      input,
      streamMode: ["messages", "updates"],
    });
  },

  /**
   * Convenience: Send a message and get a response
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

    const result = await client.runs.wait(thread.thread_id, assistantId, {
      input: {
        messages: [{ role: "user", content: message }],
      },
    });

    const messages = (result as { messages?: Message[] }).messages;
    const lastMessage = messages?.[messages.length - 1];
    const response =
      typeof lastMessage?.content === "string" ? lastMessage.content : "";

    return { threadId: thread.thread_id, response };
  },
};

export default LangGraphService;
