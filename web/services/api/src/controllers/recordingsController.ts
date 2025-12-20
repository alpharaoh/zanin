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
import { NotFoundError } from "../errors";

interface RecordingListResponse {
  recordings: Recording[];
  count: number;
}

interface CreateRecordingResponse {
  recording: Recording;
  message: string;
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
  ): Promise<CreateRecordingResponse> {
    const { userId, organizationId } = request.user!;

    const recording = await RecordingsService.create({
      organizationId,
      userId,
      audioBuffer: audio.buffer,
      filename: audio.originalname,
    });

    this.setStatus(201);
    return {
      recording,
      message: "Recording created and processing started",
    };
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

    return RecordingsService.list({
      organizationId,
      userId,
      limit,
      offset,
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
