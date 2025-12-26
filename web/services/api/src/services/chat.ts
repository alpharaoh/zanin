import { insertChatThread } from "@zanin/db/queries/insert/insertChatThread";
import { insertChatMessage } from "@zanin/db/queries/insert/insertChatMessage";
import { selectChatThread } from "@zanin/db/queries/select/one/selectChatThread";
import { selectChatThreadByScope } from "@zanin/db/queries/select/one/selectChatThreadByScope";
import { listChatMessages } from "@zanin/db/queries/select/many/listChatMessages";
import { listChatThreads } from "@zanin/db/queries/select/many/listChatThreads";
import { updateChatThread } from "@zanin/db/queries/update/updateChatThread";
import {
  SelectChatThread,
  SelectChatMessage,
} from "@zanin/db/schema";
import LangGraphService from "./external/langgraph/service";

const RECORDINGS_QUERY_ASSISTANT = "recordings_query";

export interface ChatThread {
  id: string;
  recordingId: string | null;
  referenceId: string | null;
  title: string | null;
  lastActivityAt: Date;
  createdAt: Date;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  role: "user" | "assistant";
  content: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

function mapThread(thread: SelectChatThread): ChatThread {
  return {
    id: thread.id,
    recordingId: thread.recordingId,
    referenceId: thread.referenceId,
    title: thread.title,
    lastActivityAt: thread.lastActivityAt,
    createdAt: thread.createdAt,
  };
}

function mapMessage(message: SelectChatMessage): ChatMessage {
  return {
    id: message.id,
    threadId: message.threadId,
    role: message.role as "user" | "assistant",
    content: message.content,
    metadata: message.metadata as Record<string, unknown> | null,
    createdAt: message.createdAt,
  };
}

const ChatService = {
  /**
   * Get or create a thread for a specific scope.
   * recordingId = undefined means "all recordings" scope
   * forceNew = true will always create a new thread
   */
  getOrCreateThread: async (
    organizationId: string,
    userId: string,
    recordingId?: string,
    forceNew?: boolean,
  ): Promise<ChatThread> => {
    // Try to find existing thread (unless forcing new)
    if (!forceNew) {
      const existing = await selectChatThreadByScope(
        organizationId,
        userId,
        recordingId,
      );

      if (existing) {
        return mapThread(existing);
      }
    }

    // Create new thread in LangGraph
    const langGraphThread = await LangGraphService.createThread({
      organizationId,
      userId,
      recordingId: recordingId || null,
    });

    // Create new thread in our database
    const thread = await insertChatThread({
      organizationId,
      userId,
      recordingId: recordingId || null,
      referenceId: langGraphThread.thread_id,
      title: null,
      lastActivityAt: new Date(),
    });

    return mapThread(thread);
  },

  /**
   * Get a thread by ID
   */
  getThread: async (
    threadId: string,
    organizationId: string,
  ): Promise<ChatThread | undefined> => {
    const thread = await selectChatThread(threadId, organizationId);
    return thread ? mapThread(thread) : undefined;
  },

  /**
   * List all threads for a user
   */
  listThreads: async (
    organizationId: string,
    userId: string,
    limit?: number,
    offset?: number,
  ): Promise<{ threads: ChatThread[]; count: number }> => {
    const result = await listChatThreads(organizationId, userId, limit, offset);
    return {
      threads: result.data.map(mapThread),
      count: result.count,
    };
  },

  /**
   * Get messages for a thread
   */
  getMessages: async (
    threadId: string,
    limit?: number,
    offset?: number,
  ): Promise<{ messages: ChatMessage[]; count: number }> => {
    const result = await listChatMessages(threadId, limit, offset);
    return {
      messages: result.data.map(mapMessage),
      count: result.count,
    };
  },

  /**
   * Send a message to a thread and get AI response.
   * Stores both user message and assistant response in the database.
   */
  sendMessage: async (
    threadId: string,
    organizationId: string,
    userId: string,
    content: string,
  ): Promise<{ userMessage: ChatMessage; assistantMessage: ChatMessage }> => {
    // Get the thread to find the LangGraph reference
    const thread = await selectChatThread(threadId, organizationId);
    if (!thread) {
      throw new Error("Thread not found");
    }

    // Store user message
    const userMessage = await insertChatMessage({
      threadId,
      role: "user",
      content,
      metadata: null,
    });

    // Send to LangGraph agent
    const result = await LangGraphService.run({
      threadId: thread.referenceId!,
      assistantId: RECORDINGS_QUERY_ASSISTANT,
      input: {
        messages: [{ role: "user", content }],
        organizationId,
      },
    });

    // Extract assistant response
    const messages = (result as { messages?: { role: string; content: string }[] }).messages;
    const lastMessage = messages?.[messages.length - 1];
    const responseContent =
      typeof lastMessage?.content === "string"
        ? lastMessage.content
        : "I'm sorry, I couldn't generate a response.";

    // Store assistant message
    const assistantMessage = await insertChatMessage({
      threadId,
      role: "assistant",
      content: responseContent,
      metadata: null,
    });

    // Update thread's last activity
    await updateChatThread(threadId, organizationId, {
      lastActivityAt: new Date(),
    });

    return {
      userMessage: mapMessage(userMessage),
      assistantMessage: mapMessage(assistantMessage),
    };
  },

  /**
   * Delete a thread (soft delete)
   */
  deleteThread: async (
    threadId: string,
    organizationId: string,
  ): Promise<void> => {
    const thread = await selectChatThread(threadId, organizationId);
    if (!thread) {
      throw new Error("Thread not found");
    }

    // Delete from LangGraph if we have a reference
    if (thread.referenceId) {
      try {
        await LangGraphService.deleteThread(thread.referenceId);
      } catch (error) {
        // Log but don't fail if LangGraph delete fails
        console.error("Failed to delete LangGraph thread:", error);
      }
    }

    // Soft delete in our database
    await updateChatThread(threadId, organizationId, {
      deletedAt: new Date(),
    });
  },
};

export default ChatService;
