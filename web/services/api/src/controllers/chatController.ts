import {
  Body,
  Controller,
  Delete,
  Get,
  Path,
  Post,
  Query,
  Request,
  Response,
  Route,
  Security,
  SuccessResponse,
} from "tsoa";
import type { Request as ExpressRequest } from "express";
import ChatService, { ChatThread, ChatMessage } from "../services/chat";
import { NotFoundError } from "../errors";

interface CreateThreadRequest {
  recordingId?: string;
}

interface CreateThreadResponse {
  thread: ChatThread;
}

interface GetMessagesResponse {
  messages: ChatMessage[];
  count: number;
}

interface SendMessageRequest {
  content: string;
}

interface SendMessageResponse {
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
}

interface ListThreadsResponse {
  threads: ChatThread[];
  count: number;
}

@Security("default")
@Response(401, "Unauthorized")
@Response(400, "No active organization")
@Response(500, "Internal Server Error")
@Route("v1/chat")
export class ChatController extends Controller {
  /**
   * List all chat threads for the current user.
   * - No recordingId: returns all threads
   * - recordingId=<uuid>: returns threads for that recording
   * - recordingId=null: returns threads scoped to "all recordings" (where recordingId IS NULL)
   * Returns threads ordered by last activity (most recent first).
   */
  @Get("threads")
  public async listThreads(
    @Request() request: ExpressRequest,
    @Query() recordingId?: string,
    @Query() limit?: number,
    @Query() offset?: number,
  ): Promise<ListThreadsResponse> {
    const { userId, organizationId } = request.user!;

    // Convert string "null" to actual null for filtering
    const recordingIdFilter = recordingId === "null" ? null : recordingId;

    const result = await ChatService.listThreads(
      organizationId,
      userId,
      recordingIdFilter,
      limit,
      offset,
    );

    return {
      threads: result.threads,
      count: result.count,
    };
  }

  /**
   * Create a new chat thread.
   * If recordingId is provided, the thread is scoped to that recording.
   * If not provided, the thread is scoped to all recordings.
   */
  @Post("threads")
  @SuccessResponse(201, "Created")
  public async createThread(
    @Request() request: ExpressRequest,
    @Body() body: CreateThreadRequest,
  ): Promise<CreateThreadResponse> {
    const { userId, organizationId } = request.user!;

    const thread = await ChatService.createThread(
      organizationId,
      userId,
      body.recordingId,
    );

    this.setStatus(201);
    return { thread };
  }

  /**
   * Get a specific thread by ID.
   */
  @Get("threads/{threadId}")
  @Response(404, "Thread not found")
  public async getThread(
    @Request() request: ExpressRequest,
    @Path() threadId: string,
  ): Promise<ChatThread> {
    const { organizationId } = request.user!;

    const thread = await ChatService.getThread(threadId, organizationId);

    if (!thread) {
      throw new NotFoundError("Thread not found");
    }

    return thread;
  }

  /**
   * Get messages for a thread.
   * Returns messages ordered by creation time (oldest first).
   */
  @Get("threads/{threadId}/messages")
  @Response(404, "Thread not found")
  public async getMessages(
    @Request() request: ExpressRequest,
    @Path() threadId: string,
    @Query() limit?: number,
    @Query() offset?: number,
  ): Promise<GetMessagesResponse> {
    const { organizationId } = request.user!;

    // Verify thread exists and belongs to this organization
    const thread = await ChatService.getThread(threadId, organizationId);
    if (!thread) {
      throw new NotFoundError("Thread not found");
    }

    const result = await ChatService.getMessages(threadId, limit, offset);

    return {
      messages: result.messages,
      count: result.count,
    };
  }

  /**
   * Send a message to a thread and receive an AI response.
   * Both the user message and assistant response are stored.
   */
  @Post("threads/{threadId}/messages")
  @Response(404, "Thread not found")
  @SuccessResponse(201, "Created")
  public async sendMessage(
    @Request() request: ExpressRequest,
    @Path() threadId: string,
    @Body() body: SendMessageRequest,
  ): Promise<SendMessageResponse> {
    const { organizationId } = request.user!;

    const result = await ChatService.sendMessage(
      threadId,
      organizationId,
      body.content,
    );

    this.setStatus(201);
    return result;
  }

  /**
   * Delete a chat thread.
   * This performs a soft delete.
   */
  @Delete("threads/{threadId}")
  @Response(404, "Thread not found")
  @SuccessResponse(204, "No Content")
  public async deleteThread(
    @Request() request: ExpressRequest,
    @Path() threadId: string,
  ): Promise<void> {
    const { organizationId } = request.user!;

    await ChatService.deleteThread(threadId, organizationId);
  }
}
