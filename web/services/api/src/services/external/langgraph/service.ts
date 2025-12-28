/**
 * LangGraph Service
 *
 * Directly invokes the LangGraph agent without needing a separate service.
 * The graph is imported and executed in-process.
 */

import { graph } from "../../../agents/recordings/agent";

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
   * Thread management is handled by our own database
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
    const result = await graph.invoke(input);
    return result as Record<string, unknown>;
  },

  /**
   * Stream a graph run
   * Returns an async iterable of events
   */
  stream: (options: {
    threadId: string;
    assistantId: string;
    input: Record<string, unknown>;
  }): AsyncIterable<{ event: string; data: unknown }> => {
    const { input } = options;

    return {
      async *[Symbol.asyncIterator]() {
        const stream = await graph.stream(input, { streamMode: "messages" });

        let allMessages: unknown[] = [];
        let sentInitialComplete = false;

        for await (const chunk of stream) {
          // chunk is [message, metadata] in messages mode
          const [message, metadata] = chunk as [unknown, { langgraph_node?: string }];

          if (!message) {
            continue;
          }

          allMessages.push(message);

          // Emit messages/partial for AI messages
          const msg = message as { constructor?: { name?: string }; content?: unknown; tool_calls?: unknown[] };
          if (msg.constructor?.name === "AIMessage") {
            yield {
              event: "messages/partial",
              data: [serializeMessage(message)],
            };
          }

          // Emit updates for tool results
          if (metadata?.langgraph_node === "toolNode") {
            yield {
              event: "updates",
              data: {
                toolNode: {
                  messages: [serializeMessage(message)],
                },
              },
            };
          }

          // Send initial messages/complete
          if (!sentInitialComplete && allMessages.length > 0) {
            sentInitialComplete = true;
            yield {
              event: "messages/complete",
              data: allMessages.map(serializeMessage),
            };
          }
        }

        // Final messages/complete
        yield {
          event: "messages/complete",
          data: allMessages.map(serializeMessage),
        };
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

    const result = await graph.invoke({
      messages: [{ role: "user", content: message }],
    });

    const messages = (result as unknown as { messages?: { content?: string }[] }).messages;
    const lastMessage = messages?.[messages.length - 1];
    const response =
      typeof lastMessage?.content === "string" ? lastMessage.content : "";

    return { threadId: actualThreadId, response };
  },
};

function serializeMessage(msg: unknown): Record<string, unknown> {
  const message = msg as {
    id?: string;
    content?: unknown;
    constructor?: { name?: string };
    tool_calls?: Array<{ id: string; name: string; args: unknown }>;
    name?: string;
    tool_call_id?: string;
  };

  const base: Record<string, unknown> = {
    id: message.id,
    content: message.content,
  };

  const typeName = message.constructor?.name;

  if (typeName === "HumanMessage") {
    return { ...base, type: "human" };
  }
  if (typeName === "AIMessage") {
    return {
      ...base,
      type: "ai",
      tool_calls: message.tool_calls?.map((tc) => ({
        id: tc.id,
        name: tc.name,
        args: tc.args,
      })),
    };
  }
  if (typeName === "ToolMessage") {
    return {
      ...base,
      type: "tool",
      name: message.name,
      tool_call_id: message.tool_call_id,
    };
  }

  return { ...base, type: "unknown" };
}

export default LangGraphService;
