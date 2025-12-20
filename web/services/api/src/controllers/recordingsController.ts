import {
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
  UploadedFile,
} from "tsoa";
import type { Request as ExpressRequest } from "express";
import { RecordingsService, Recording } from "../services/recordings";
import {
  RecordingsSearchService,
  RecordingWithMatches,
  AnswerSource,
} from "../services/recordingsSearch";
import { NotFoundError } from "../errors";

interface RecordingListResponse {
  recordings: Recording[];
  count: number;
}

interface RecordingSearchResponse {
  results: RecordingWithMatches[];
  totalMatches: number;
}

interface RecordingAskResponse {
  answer: string;
  sources: AnswerSource[];
}

@Security("default")
@Response(401, "Unauthorized")
@Response(400, "No active organization")
@Response(500, "Internal Server Error")
@Route("v1/recordings")
export class RecordingsController extends Controller {
  /**
   * Upload an audio file and create a new recording.
   * The audio will be processed asynchronously for transcription and speaker identification.
   */
  @Post()
  @SuccessResponse(201, "Created")
  public async createRecording(
    @Request() request: ExpressRequest,
    @UploadedFile() audio: Express.Multer.File,
  ): Promise<Recording> {
    const { userId, organizationId } = request.user!;

    const recording = await RecordingsService.create({
      organizationId,
      userId,
      audioBuffer: audio.buffer,
      filename: audio.originalname,
    });

    return recording;
  }

  /**
   * List all recordings for the current organization.
   */
  @Get()
  public async listRecordings(
    @Request() request: ExpressRequest,
    @Query() limit?: number,
    @Query() offset?: number,
  ): Promise<RecordingListResponse> {
    const { userId, organizationId } = request.user!;

    return await RecordingsService.list({
      organizationId,
      userId,
      limit,
      offset,
    });
  }

  /**
   * Search recordings by semantic query.
   * Returns recordings with matching transcript chunks, ranked by relevance.
   * Optionally filter by date range using startDate and endDate (ISO 8601 format).
   */
  @Get("search")
  public async searchRecordings(
    @Request() request: ExpressRequest,
    @Query() query: string,
    @Query() startDate?: Date,
    @Query() endDate?: Date,
    @Query() limit?: number,
    @Query() rerank?: boolean,
  ): Promise<RecordingSearchResponse> {
    const { organizationId } = request.user!;

    return await RecordingsSearchService.search({
      organizationId,
      query,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit,
      rerank,
    });
  }

  /**
   * Ask a question and get an AI-generated answer based on your recordings.
   * Uses semantic search to find relevant transcript chunks and generates a response.
   * Optionally filter by date range using startDate and endDate (ISO 8601 format).
   */
  @Get("ask")
  public async askRecordings(
    @Request() request: ExpressRequest,
    @Query() query: string,
    @Query() startDate?: Date,
    @Query() endDate?: Date,
    @Query() maxSources?: number,
  ): Promise<RecordingAskResponse> {
    const { organizationId } = request.user!;

    return await RecordingsSearchService.ask({
      organizationId,
      question: query,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      maxSources,
    });
  }

  /**
   * Get a specific recording by ID.
   */
  @Get("{recordingId}")
  @Response(404, "Recording not found")
  public async getRecording(
    @Request() request: ExpressRequest,
    @Path() recordingId: string,
  ): Promise<Recording> {
    const { organizationId } = request.user!;

    const recording = await RecordingsService.getById(
      recordingId,
      organizationId,
    );

    if (!recording) {
      throw new NotFoundError("Recording not found");
    }

    return recording;
  }

  /**
   * Delete a recording
   */
  @Delete("{recordingId}")
  @Response(404, "Recording not found")
  @SuccessResponse(204)
  public async deleteRecording(
    @Request() request: ExpressRequest,
    @Path() recordingId: string,
  ): Promise<void> {
    const { organizationId } = request.user!;

    const recording = await RecordingsService.delete(
      recordingId,
      organizationId,
    );

    if (!recording) {
      throw new NotFoundError("Recording not found");
    }
  }
}
