import {
  Body,
  Controller,
  Get,
  Path,
  Post,
  Query,
  Request,
  Route,
  SuccessResponse,
} from "tsoa";
import type { Request as ExpressRequest } from "express";

interface User {
  id: number;
  name?: string;
}

interface CreateUserRequest {
  name: string;
}

@Route("users")
export class UsersController extends Controller {
  @Get("{userId}")
  public async getUser(
    @Request() req: ExpressRequest,
    @Path() userId: number,
    @Query() name?: string,
  ): Promise<User> {
    req.log.info({ userId, name }, "Getting user");
    return {
      id: userId,
      name: name,
    };
  }

  @SuccessResponse("201", "Created")
  @Post()
  public async createUser(
    @Body() requestBody: CreateUserRequest,
    @Request() req: ExpressRequest,
  ): Promise<void> {
    req.log.info({ requestBody }, "Creating user");
    this.setStatus(201);
  }
}
