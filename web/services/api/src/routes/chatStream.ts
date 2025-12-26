import { Router, Request, Response } from "express";
import { auth, fromNodeHeaders } from "@zanin/auth";
import { selectChatThread } from "@zanin/db/queries/select/one/selectChatThread";
import { insertChatMessage } from "@zanin/db/queries/insert/insertChatMessage";
import { updateChatThread } from "@zanin/db/queries/update/updateChatThread";
import LangGraphService from "../services/external/langgraph/service";

const RECORDINGS_QUERY_ASSISTANT = "recordings";

const router = Router();

/**
 * Stream event types sent to the client
 */
type StreamEvent =
  | { type: "user_message"; message: unknown }
  | { type: "token"; content: string }
  | { type: "tool_start"; toolCallId: string; name: string }
  | { type: "tool_end"; toolCallId: string }
  | { type: "assistant_message"; message: unknown }
  | { type: "error"; message: string }
  | { type: "done" };

/**
 * Send an SSE event to the client
 */
function sendEvent(res: Response, event: StreamEvent) {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

/**
 * Helper: flatten LangGraph message content into a single string
 */
function extractTextFromContent(
  content: string | Array<{ type: string; text?: string }>,
): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";

  // LangGraph / LC messages often have blocks like { type: "text", text: "..." }
  return content
    .filter((chunk) => chunk.type === "text" && typeof chunk.text === "string")
    .map((chunk) => chunk.text as string)
    .join("");
}

/**
 * POST /api/v1/chat/threads/:threadId/stream
 *
 * Stream a chat message response using Server-Sent Events.
 * Bypasses TSOA since it doesn't support streaming responses.
 */
router.post(
  "/threads/:threadId/stream",
  async (req: Request, res: Response) => {
    try {
      // Authenticate the request
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
      });

      if (!session) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const organizationId = session.session.activeOrganizationId;
      if (!organizationId) {
        res.status(400).json({ error: "No active organization" });
        return;
      }

      const { threadId } = req.params;
      const { content } = req.body as { content: string };

      if (!content) {
        res.status(400).json({ error: "Content is required" });
        return;
      }

      // Verify thread exists and belongs to this organization
      const thread = await selectChatThread(threadId, organizationId);
      if (!thread) {
        res.status(404).json({ error: "Thread not found" });
        return;
      }

      // Store user message
      const userMessage = await insertChatMessage({
        threadId,
        role: "user",
        content,
        metadata: null,
      });

      // Set up SSE headers
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering
      // Make sure headers go out immediately
      (res as any).flushHeaders?.();

      // Send user message event
      sendEvent(res, {
        type: "user_message",
        message: {
          id: userMessage.id,
          threadId: userMessage.threadId,
          role: userMessage.role,
          content: userMessage.content,
          metadata: userMessage.metadata,
          createdAt: userMessage.createdAt.toISOString(),
        },
      });

      // Stream from LangGraph
      const stream = LangGraphService.stream({
        threadId: thread.referenceId!,
        assistantId: RECORDINGS_QUERY_ASSISTANT,
        input: {
          messages: [{ role: "user", content }],
          organizationId,
          recordingId: thread.recordingId,
        },
      });

      // This tracks the *full* assistant text as we go
      let assistantContent = "";

      // Track tool calls so we can send tool_start / tool_end
      const toolCalls = new Map<string, { name: string; completed: boolean }>();

      for await (const event of stream as AsyncIterable<{
        event: string;
        data: unknown;
      }>) {
        console.log("\n\nevent:", event, "\n\n\n");
        if (event.event === "messages/partial") {
          /**
           * messages/partial:
           *   event.data is an array of LangChain-style messages.
           *   For AI messages, content is the *current full text so far*, not just a delta.
           */
          const messages = event.data as Array<{
            type?: string;
            content?: string | Array<{ type: string; text?: string }>;
            tool_calls?: Array<{ id: string; name: string }>;
          }>;

          for (const msg of messages) {
            if (msg.type === "ai" && msg.content != null) {
              const fullText = extractTextFromContent(msg.content);
              // Compute just the new suffix since last time
              const newContent = fullText.slice(assistantContent.length);
              if (newContent) {
                assistantContent = fullText;
                sendEvent(res, { type: "token", content: newContent });
              }
            }

            // Emit tool_start for new tool calls
            if (msg.tool_calls && msg.tool_calls.length > 0) {
              for (const toolCall of msg.tool_calls) {
                if (!toolCalls.has(toolCall.id)) {
                  toolCalls.set(toolCall.id, {
                    name: toolCall.name,
                    completed: false,
                  });
                  sendEvent(res, {
                    type: "tool_start",
                    toolCallId: toolCall.id,
                    name: toolCall.name,
                  });
                }
              }
            }
          }
        } else if (event.event === "messages/complete") {
          /**
           * messages/complete:
           *   final AI messages with full content.
           */
          const messages = event.data as Array<{
            type?: string;
            content?: string | Array<{ type: string; text?: string }>;
          }>;

          const lastAiMessage = messages.filter((m) => m.type === "ai").pop();
          if (lastAiMessage && lastAiMessage.content != null) {
            assistantContent = extractTextFromContent(lastAiMessage.content);
          }
        } else if (event.event === "updates") {
          // [api] event: {
          // [api]   id: "4",
          // [api]   event: "updates",
          // [api]   data: {
          // [api]     llmCall: {
          // [api]       messages: [
          // [api]         [Object ...]
          // [api]       ],
          // [api]       llmCalls: 1,
          // [api]     },
          // [api]   },
          // [api] }
          // [api]
          /**
           * updates:
           *   node-specific updates. Tool results usually show up under a `tools` key.
           */
          const updates = event.data as Record<string, unknown>;

          if ("tools" in updates) {
            // Mark all known tools as completed when we see any tool update.
            for (const [toolCallId, toolInfo] of toolCalls.entries()) {
              if (!toolInfo.completed) {
                toolInfo.completed = true;
                sendEvent(res, { type: "tool_end", toolCallId });
              }
            }
          }
        }

        // (Optional) You could also handle "messages/metadata", "events", "debug" here
        // if you decide to add those stream modes later.
      }

      // Ensure any remaining tools are marked as completed
      for (const [toolCallId, toolInfo] of toolCalls.entries()) {
        if (!toolInfo.completed) {
          sendEvent(res, { type: "tool_end", toolCallId });
        }
      }

      // Store assistant message in DB
      const assistantMessage = await insertChatMessage({
        threadId,
        role: "assistant",
        content: assistantContent,
        metadata:
          toolCalls.size > 0
            ? {
                toolCalls: Array.from(toolCalls.entries()).map(
                  ([id, info]) => ({
                    id,
                    name: info.name,
                  }),
                ),
              }
            : null,
      });

      // Update thread's last activity
      await updateChatThread(threadId, organizationId, {
        lastActivityAt: new Date(),
      });

      // Send assistant message event
      sendEvent(res, {
        type: "assistant_message",
        message: {
          id: assistantMessage.id,
          threadId: assistantMessage.threadId,
          role: assistantMessage.role,
          content: assistantMessage.content,
          metadata: assistantMessage.metadata,
          createdAt: assistantMessage.createdAt.toISOString(),
        },
      });

      // Send done event & close stream
      sendEvent(res, { type: "done" });
      res.end();
    } catch (error) {
      console.error("Stream error:", error);

      // If headers haven't been sent yet, send error as JSON
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" });
        return;
      }

      // Otherwise send as SSE event
      sendEvent(res, {
        type: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      res.end();
    }
  },
);

export default router;
