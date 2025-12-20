import {
  Controller,
  Delete,
  Get,
  Post,
  Request,
  Response,
  Route,
  Security,
  SuccessResponse,
  UploadedFile,
} from "tsoa";
import type { Request as ExpressRequest } from "express";
import SIDService, { ProfileInfo } from "../services/external/sid/service";

interface EnrollmentResponse {
  success: boolean;
  audioDurationSeconds: number;
  embeddingDimension: number;
  message?: string;
}

@Security("default")
@Response(401, "Unauthorized")
@Response(400, "No active organization")
@Response(500, "Internal Server Error")
@Route("v1/sid")
export class SIDController extends Controller {
  /**
   * Enroll a voice profile for the current user.
   * Upload an audio file containing your voice to create or update your voice profile.
   */
  @Post("enroll")
  @SuccessResponse(201, "Created")
  public async enroll(
    @Request() request: ExpressRequest,
    @UploadedFile() audio: Express.Multer.File,
  ): Promise<EnrollmentResponse> {
    const { userId } = request.user!;

    const result = await SIDService.enroll(
      userId,
      audio.buffer,
      audio.originalname,
    );

    return {
      success: result.success,
      audioDurationSeconds: result.audio_duration_seconds,
      embeddingDimension: result.embedding_dimension,
      message: result.message,
    };
  }

  /**
   * Get the voice profile status for the current user.
   */
  @Get("profile")
  public async getProfile(
    @Request() request: ExpressRequest,
  ): Promise<ProfileInfo> {
    const { userId } = request.user!;

    return await SIDService.getProfile(userId);
  }

  /**
   * Delete the voice profile for the current user.
   */
  @Delete("profile")
  @SuccessResponse(204)
  public async deleteProfile(
    @Request() request: ExpressRequest,
  ): Promise<void> {
    const { userId } = request.user!;

    await SIDService.deleteProfile(userId);
  }
}
