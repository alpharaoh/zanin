import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
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
import {
  SignalsService,
  Signal,
  SignalEvaluation,
  Achievement,
  SignalsStats,
  ACHIEVEMENT_DEFINITIONS,
} from "../services/signals";
import { NotFoundError } from "../errors";

interface CreateSignalRequest {
  name: string;
  description: string;
  goal: string;
  failureCondition: string;
  goodExamples?: string[];
  badExamples?: string[];
}

interface UpdateSignalRequest {
  name?: string;
  description?: string;
  goal?: string;
  failureCondition?: string;
  goodExamples?: string[];
  badExamples?: string[];
  isActive?: boolean;
}

interface SignalListResponse {
  signals: Signal[];
  count: number;
}

interface SignalEvaluationListResponse {
  evaluations: SignalEvaluation[];
  count: number;
}

interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
}

interface AchievementListResponse {
  achievements: Achievement[];
  definitions: Record<string, AchievementDefinition>;
}

@Security("default")
@Response(401, "Unauthorized")
@Response(400, "No active organization")
@Response(500, "Internal Server Error")
@Route("v1/signals")
export class SignalsController extends Controller {
  /**
   * Create a new signal to track behavior in recordings.
   */
  @Post()
  @SuccessResponse(201, "Created")
  public async createSignal(
    @Request() request: ExpressRequest,
    @Body() body: CreateSignalRequest,
  ): Promise<Signal> {
    const { userId, organizationId } = request.user!;

    return await SignalsService.create({
      organizationId,
      userId,
      ...body,
    });
  }

  /**
   * List all signals for the current user.
   */
  @Get()
  public async listSignals(
    @Request() request: ExpressRequest,
    @Query() isActive?: boolean,
    @Query() limit?: number,
    @Query() offset?: number,
  ): Promise<SignalListResponse> {
    const { userId, organizationId } = request.user!;

    return await SignalsService.list({
      organizationId,
      userId,
      isActive,
      limit,
      offset,
    });
  }

  /**
   * Get dashboard stats for all signals.
   */
  @Get("stats")
  public async getSignalsStats(
    @Request() request: ExpressRequest,
  ): Promise<SignalsStats> {
    const { userId, organizationId } = request.user!;

    return await SignalsService.getStats(userId, organizationId);
  }

  /**
   * Get all achievements for the current user.
   */
  @Get("achievements")
  public async getAchievements(
    @Request() request: ExpressRequest,
  ): Promise<AchievementListResponse> {
    const { userId, organizationId } = request.user!;

    return await SignalsService.listAchievements(userId, organizationId);
  }

  /**
   * Get a specific signal by ID.
   */
  @Get("{signalId}")
  @Response(404, "Signal not found")
  public async getSignal(
    @Request() request: ExpressRequest,
    @Path() signalId: string,
  ): Promise<Signal> {
    const { userId, organizationId } = request.user!;

    const signal = await SignalsService.getById(
      signalId,
      userId,
      organizationId,
    );

    if (!signal) {
      throw new NotFoundError("Signal not found");
    }

    return signal;
  }

  /**
   * Update a signal.
   */
  @Patch("{signalId}")
  @Response(404, "Signal not found")
  public async updateSignal(
    @Request() request: ExpressRequest,
    @Path() signalId: string,
    @Body() body: UpdateSignalRequest,
  ): Promise<Signal> {
    const { userId, organizationId } = request.user!;

    const signal = await SignalsService.update(
      signalId,
      userId,
      organizationId,
      body,
    );

    if (!signal) {
      throw new NotFoundError("Signal not found");
    }

    return signal;
  }

  /**
   * Delete a signal (soft delete).
   */
  @Delete("{signalId}")
  @Response(404, "Signal not found")
  @SuccessResponse(204)
  public async deleteSignal(
    @Request() request: ExpressRequest,
    @Path() signalId: string,
  ): Promise<void> {
    const { userId, organizationId } = request.user!;

    const signal = await SignalsService.delete(
      signalId,
      userId,
      organizationId,
    );

    if (!signal) {
      throw new NotFoundError("Signal not found");
    }
  }

  /**
   * Get evaluations for a specific signal.
   */
  @Get("{signalId}/evaluations")
  @Response(404, "Signal not found")
  public async getSignalEvaluations(
    @Request() request: ExpressRequest,
    @Path() signalId: string,
    @Query() limit?: number,
    @Query() offset?: number,
  ): Promise<SignalEvaluationListResponse> {
    const { userId, organizationId } = request.user!;

    // Verify signal exists
    const signal = await SignalsService.getById(
      signalId,
      userId,
      organizationId,
    );

    if (!signal) {
      throw new NotFoundError("Signal not found");
    }

    return await SignalsService.listEvaluations(
      signalId,
      userId,
      organizationId,
      limit,
      offset,
    );
  }
}
