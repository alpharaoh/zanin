import { Router, Request, Response } from "express";
import { auth, fromNodeHeaders } from "@zanin/auth";
import { selectChatThread } from "@zanin/db/queries/select/one/selectChatThread";
import { insertChatMessage } from "@zanin/db/queries/insert/insertChatMessage";
import { updateChatThread } from "@zanin/db/queries/update/updateChatThread";
import LangGraphService from "../services/external/langgraph/service";
import { inngest } from "../inngest/client";

const RECORDINGS_QUERY_ASSISTANT = "recordings";
const router = Router();

interface ToolResult {
  name: string;
  count?: number;
  recordings?: Array<{
    id: string;
    title: string | null;
    createdAt: string;
    relevanceScore?: number;
    excerpts?: string[];
  }>;
}

type StreamEvent =
  | { type: "user_message"; message: unknown }
  | { type: "token"; content: string }
  | { type: "tool_start"; toolCallId: string; name: string }
  | { type: "tool_end"; toolCallId: string; result?: ToolResult }
  | { type: "assistant_message"; message: unknown }
  | { type: "error"; message: string }
  | { type: "done" };

function parseToolResult(
  name: string,
  content: string,
): ToolResult | undefined {
  try {
    const data = JSON.parse(content);

    if (name === "get_recording_details" && data.recordings) {
      return {
        name,
        count: data.recordings.length,
        recordings: data.recordings.map(
          (r: { id: string; title: string | null; createdAt: string }) => ({
            id: r.id,
            title: r.title,
            createdAt: r.createdAt,
          }),
        ),
      };
    }

    if (name === "search_recordings" && data.results) {
      return {
        name,
        count: data.results.length,
        recordings: data.results.map(
          (r: {
            recordingId: string;
            relevanceScore?: number;
            relevantExcerpts?: string[];
          }) => ({
            id: r.recordingId,
            title: null,
            createdAt: "",
            relevanceScore: r.relevanceScore,
            excerpts: r.relevantExcerpts,
          }),
        ),
      };
    }
  } catch {
    // Ignore parse errors
  }
  return undefined;
}

function send(res: Response, event: StreamEvent) {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

function extractText(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .filter((c) => c.type === "text" && c.text)
      .map((c) => c.text)
      .join("");
  }
  return "";
}

router.post(
  "/threads/:threadId/stream",
  async (req: Request, res: Response) => {
    try {
      // Auth
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
      });
      if (!session) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const organizationId = session.session.activeOrganizationId;
      if (!organizationId) {
        return res.status(400).json({ error: "No active organization" });
      }

      const { threadId } = req.params;
      const { content } = req.body as { content: string };
      if (!content) {
        return res.status(400).json({ error: "Content is required" });
      }

      const thread = await selectChatThread(threadId, organizationId);
      if (!thread) {
        return res.status(404).json({ error: "Thread not found" });
      }

      // Store user message
      const userMessage = await insertChatMessage({
        threadId,
        role: "user",
        content,
        metadata: null,
      });

      // SSE headers
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders();

      send(res, {
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

      let assistantContent = "";
      const tools = new Map<
        string,
        { name: string; completed: boolean; result?: ToolResult }
      >();

      for await (const event of stream as AsyncIterable<{
        event: string;
        data: unknown;
      }>) {
        const { event: eventType, data } = event;

        if (eventType === "messages/partial") {
          // Streaming AI content
          const messages = data as Array<{
            type?: string;
            content?: unknown;
            tool_calls?: Array<{ id: string; name: string }>;
          }>;
          const aiMsg = messages.find((m) => m.type === "ai");
          if (aiMsg) {
            // Stream text content
            if (aiMsg.content) {
              const fullText = extractText(aiMsg.content);
              const delta = fullText.slice(assistantContent.length);
              if (delta) {
                assistantContent = fullText;
                send(res, { type: "token", content: delta });
              }
            }
            // Tool calls can appear in partial messages too
            if (aiMsg.tool_calls?.length) {
              for (const tc of aiMsg.tool_calls) {
                if (!tools.has(tc.id)) {
                  tools.set(tc.id, { name: tc.name, completed: false });
                  send(res, {
                    type: "tool_start",
                    toolCallId: tc.id,
                    name: tc.name,
                  });
                }
              }
            }
          }
        } else if (eventType === "messages/complete") {
          const messages = data as Array<{
            type?: string;
            content?: unknown;
            name?: string;
            tool_calls?: Array<{ id: string; name: string }>;
            tool_call_id?: string;
          }>;

          for (const msg of messages) {
            // Tool invocation (AI message with tool_calls)
            if (msg.type === "ai" && msg.tool_calls?.length) {
              for (const tc of msg.tool_calls) {
                if (!tools.has(tc.id)) {
                  tools.set(tc.id, { name: tc.name, completed: false });
                  send(res, {
                    type: "tool_start",
                    toolCallId: tc.id,
                    name: tc.name,
                  });
                }
              }
            }

            // Tool result
            if (msg.type === "tool" && msg.tool_call_id && msg.name) {
              const tool = tools.get(msg.tool_call_id);
              if (tool && !tool.completed) {
                const result = parseToolResult(
                  msg.name,
                  typeof msg.content === "string" ? msg.content : "",
                );
                tool.completed = true;
                tool.result = result;
                send(res, {
                  type: "tool_end",
                  toolCallId: msg.tool_call_id,
                  result,
                });
              }
            }

            // Final AI content
            if (msg.type === "ai" && msg.content && !msg.tool_calls?.length) {
              assistantContent = extractText(msg.content);
            }
          }
        } else if (eventType === "updates") {
          // Tool node completion
          const updates = data as Record<string, unknown>;
          if ("toolNode" in updates) {
            console.log("updates", JSON.stringify(updates));
            const toolNode = updates.toolNode as {
              messages?: Array<{
                type?: string;
                name?: string;
                content?: string;
                tool_call_id?: string;
              }>;
            };
            // Parse results from toolNode messages
            if (toolNode.messages) {
              for (const msg of toolNode.messages) {
                if (msg.type === "tool" && msg.tool_call_id && msg.name) {
                  const tool = tools.get(msg.tool_call_id);
                  if (tool && !tool.completed) {
                    const result = parseToolResult(msg.name, msg.content || "");
                    tool.completed = true;
                    tool.result = result;
                    send(res, {
                      type: "tool_end",
                      toolCallId: msg.tool_call_id,
                      result,
                    });
                  }
                }
              }
            }
          }
        }
      }

      // Mark any tools that didn't get an explicit end
      for (const [id, tool] of tools) {
        if (!tool.completed) {
          send(res, { type: "tool_end", toolCallId: id });
        }
      }

      // Store assistant message with tool results in metadata
      const assistantMessage = await insertChatMessage({
        threadId,
        role: "assistant",
        content: assistantContent,
        metadata:
          tools.size > 0
            ? {
                toolCalls: Array.from(tools.entries()).map(([id, tool]) => ({
                  id,
                  name: tool.name,
                  result: tool.result,
                })),
              }
            : null,
      });

      await updateChatThread(threadId, organizationId, {
        lastActivityAt: new Date(),
      });

      // Generate title if thread doesn't have one yet
      if (!thread.title) {
        await inngest.send({
          name: "chat/generate-title",
          data: {
            threadId,
            organizationId,
          },
        });
      }

      send(res, {
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

      send(res, { type: "done" });
      res.end();
    } catch (error) {
      console.error("Stream error:", error);
      if (!res.headersSent) {
        return res.status(500).json({ error: "Internal server error" });
      }
      send(res, {
        type: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      res.end();
    }
  },
);

export default router;
