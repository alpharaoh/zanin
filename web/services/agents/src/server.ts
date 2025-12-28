/**
 * HTTP server that exposes the LangGraph agent
 * Provides /invoke and /stream endpoints compatible with the API's LangGraphService
 */
import { serve } from "bun";
import { graph } from "./recordings/agent";
import { AIMessage, HumanMessage, ToolMessage, BaseMessage } from "@langchain/core/messages";

const PORT = process.env.PORT || 3001;

interface StreamEvent {
  event: string;
  data: unknown;
}

function serializeMessage(msg: BaseMessage): Record<string, unknown> {
  const base: Record<string, unknown> = {
    id: msg.id,
    content: msg.content,
  };

  if (msg instanceof HumanMessage) {
    return { ...base, type: "human" };
  }
  if (msg instanceof AIMessage) {
    const aiMsg = msg as AIMessage;
    return {
      ...base,
      type: "ai",
      tool_calls: aiMsg.tool_calls?.map((tc) => ({
        id: tc.id,
        name: tc.name,
        args: tc.args,
      })),
    };
  }
  if (msg instanceof ToolMessage) {
    const toolMsg = msg as ToolMessage;
    return {
      ...base,
      type: "tool",
      name: toolMsg.name,
      tool_call_id: toolMsg.tool_call_id,
    };
  }
  return { ...base, type: "unknown" };
}

const server = serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // Health check
    if (url.pathname === "/health") {
      return new Response("ok", { status: 200 });
    }

    // Invoke graph endpoint (non-streaming)
    if (req.method === "POST" && url.pathname === "/invoke") {
      try {
        const body = await req.json();
        const result = await graph.invoke(body.input, body.config);
        return Response.json(result);
      } catch (error) {
        console.error("Error invoking graph:", error);
        return Response.json(
          { error: error instanceof Error ? error.message : "Unknown error" },
          { status: 500 },
        );
      }
    }

    // Stream endpoint - SSE format compatible with LangGraph SDK events
    if (req.method === "POST" && url.pathname === "/stream") {
      try {
        const body = await req.json();

        return new Response(
          new ReadableStream({
            async start(controller) {
              const encoder = new TextEncoder();

              function sendEvent(event: StreamEvent) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
                );
              }

              try {
                // Stream with messages mode to get message updates
                const stream = await graph.stream(body.input, {
                  ...body.config,
                  streamMode: "messages",
                });

                let allMessages: BaseMessage[] = [];
                let sentInitialMessages = false;

                for await (const chunk of stream) {
                  // chunk is [message, metadata] tuple in messages mode
                  const [message, metadata] = chunk as [BaseMessage, { langgraph_node?: string }];

                  if (!message) {
                    continue;
                  }

                  // Build up messages array
                  allMessages.push(message);

                  // Send messages/partial for streaming AI content
                  if (message instanceof AIMessage) {
                    sendEvent({
                      event: "messages/partial",
                      data: [serializeMessage(message)],
                    });
                  }

                  // Send updates event for tool node results
                  if (metadata?.langgraph_node === "toolNode" && message instanceof ToolMessage) {
                    sendEvent({
                      event: "updates",
                      data: {
                        toolNode: {
                          messages: [serializeMessage(message)],
                        },
                      },
                    });
                  }

                  // Send messages/complete periodically
                  if (!sentInitialMessages && allMessages.length > 0) {
                    sentInitialMessages = true;
                    sendEvent({
                      event: "messages/complete",
                      data: allMessages.map(serializeMessage),
                    });
                  }
                }

                // Send final messages/complete with all messages
                sendEvent({
                  event: "messages/complete",
                  data: allMessages.map(serializeMessage),
                });

                controller.close();
              } catch (error) {
                console.error("Stream error:", error);
                sendEvent({
                  event: "error",
                  data: { message: error instanceof Error ? error.message : "Unknown error" },
                });
                controller.close();
              }
            },
          }),
          {
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              "Connection": "keep-alive",
            },
          },
        );
      } catch (error) {
        console.error("Error starting stream:", error);
        return Response.json(
          { error: error instanceof Error ? error.message : "Unknown error" },
          { status: 500 },
        );
      }
    }

    return new Response("Not found", { status: 404 });
  },
});

console.log(`Agents server running on port ${server.port}`);
