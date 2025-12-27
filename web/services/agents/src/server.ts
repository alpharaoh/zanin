/**
 * Simple HTTP server that exposes the LangGraph agent
 * This runs standalone without requiring LangGraph CLI
 */
import { serve } from "bun";
import { graph } from "./recordings/agent";

const PORT = process.env.PORT || 3101;

const server = serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // Health check
    if (url.pathname === "/health") {
      return new Response("ok", { status: 200 });
    }

    // Invoke graph endpoint
    if (req.method === "POST" && url.pathname === "/invoke") {
      try {
        const body = await req.json();
        const result = await graph.invoke(body.input, body.config);
        return Response.json(result);
      } catch (error) {
        console.error("Error invoking graph:", error);
        return Response.json(
          { error: error instanceof Error ? error.message : "Unknown error" },
          { status: 500 }
        );
      }
    }

    // Stream endpoint for streaming responses
    if (req.method === "POST" && url.pathname === "/stream") {
      try {
        const body = await req.json();
        const stream = await graph.stream(body.input, body.config);

        return new Response(
          new ReadableStream({
            async start(controller) {
              for await (const chunk of stream) {
                controller.enqueue(
                  new TextEncoder().encode(JSON.stringify(chunk) + "\n")
                );
              }
              controller.close();
            },
          }),
          {
            headers: {
              "Content-Type": "application/x-ndjson",
              "Transfer-Encoding": "chunked",
            },
          }
        );
      } catch (error) {
        console.error("Error streaming graph:", error);
        return Response.json(
          { error: error instanceof Error ? error.message : "Unknown error" },
          { status: 500 }
        );
      }
    }

    return new Response("Not found", { status: 404 });
  },
});

console.log(`Agents server running on port ${server.port}`);
