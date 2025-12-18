import { Controller, Get, Request, Response, Route, Security } from "tsoa";
import type { Request as ExpressRequest } from "express";
import type { UserSession } from "../types/user";

@Security("default")
@Response(401, "Unauthorized")
@Response(500, "Internal Server Error")
@Route("users")
export class UsersController extends Controller {
  /**
   * Retrieves the details of the user calling the API.
   */
  @Get("me")
  public async getMe(@Request() request: ExpressRequest): Promise<UserSession> {
    return request.user;
  }
}
