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
@Response(500, "Internal Server Error")
@Route("recordings")
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
    const user = request.user;
    if (!user) {
      this.setStatus(401);
      throw new Error("Unauthorized");
    }

    const organizationId = user.session.activeOrganizationId;
    if (!organizationId) {
      this.setStatus(400);
      throw new Error("No active organization");
    }

    const recording = await RecordingsService.create({
      organizationId,
      userId: user.user.id,
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
    const user = request.user;
    if (!user) {
      this.setStatus(401);
      throw new Error("Unauthorized");
    }

    const organizationId = user.session.activeOrganizationId;
    if (!organizationId) {
      this.setStatus(400);
      throw new Error("No active organization");
    }

    const recordings = await RecordingsService.list({
      organizationId,
      limit,
      offset,
    });

    return {
      recordings,
      count: recordings.length,
    };
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
    const user = request.user;
    if (!user) {
      this.setStatus(401);
      throw new Error("Unauthorized");
    }

    const organizationId = user.session.activeOrganizationId;
    if (!organizationId) {
      this.setStatus(400);
      throw new Error("No active organization");
    }

    const recording = await RecordingsService.getById(
      recordingId,
      organizationId,
    );

    if (!recording) {
      this.setStatus(404);
      throw new Error("Recording not found");
    }

    return recording;
  }

  /**
   * Delete a recording (soft delete).
   */
  @Delete("{recordingId}")
  @Response(404, "Recording not found")
  @SuccessResponse(200, "Deleted")
  public async deleteRecording(
    @Request() request: ExpressRequest,
    @Path() recordingId: string,
  ): Promise<{ success: boolean; message: string }> {
    const user = request.user;
    if (!user) {
      this.setStatus(401);
      throw new Error("Unauthorized");
    }

    const organizationId = user.session.activeOrganizationId;
    if (!organizationId) {
      this.setStatus(400);
      throw new Error("No active organization");
    }

    const recording = await RecordingsService.delete(
      recordingId,
      organizationId,
    );

    if (!recording) {
      this.setStatus(404);
      throw new Error("Recording not found");
    }

    return {
      success: true,
      message: "Recording deleted successfully",
    };
  }
}
