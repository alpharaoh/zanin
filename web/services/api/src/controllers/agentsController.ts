import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  Response,
  Route,
  Security,
} from "tsoa";
import type { Request as ExpressRequest } from "express";
import LangGraphService, {
  type Assistant,
} from "../services/external/langgraph/service";

interface RunAgentRequest {
  assistantId: string;
  message: string;
  threadId?: string;
}

interface RunAgentResponse {
  threadId: string;
  response: string;
}

@Security("default")
@Response(401, "Unauthorized")
@Response(500, "Internal Server Error")
@Route("v1/agents")
export class AgentsController extends Controller {
  /**
   * List all available agents/assistants.
   */
  @Get()
  public async listAgents(@Request() _: ExpressRequest): Promise<Assistant[]> {
    return LangGraphService.listAssistants();
  }

  /**
   * Run an agent with a message.
   * Optionally provide a threadId to continue an existing conversation.
   */
  @Post("run")
  public async run(
    @Request() _: ExpressRequest,
    @Body() body: RunAgentRequest,
  ): Promise<RunAgentResponse> {
    const { assistantId, message, threadId } = body;

    const result = await LangGraphService.chat({
      assistantId,
      threadId,
      message,
    });

    return { threadId: result.threadId, response: result.response };
  }
}
