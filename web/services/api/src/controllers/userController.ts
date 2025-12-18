import { Controller, Get, Request, Route, Security } from "tsoa";
import type { Request as ExpressRequest } from "express";
import type { UserSession } from "../types/user";

@Route("users")
export class UsersController extends Controller {
  /**
   * Retrieves the details of the user calling the API.
   */
  @Security("default")
  @Get("me")
  public async getUser(
    @Request() request: ExpressRequest,
  ): Promise<UserSession> {
    return request.user;
  }
}
