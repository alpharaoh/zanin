import {
  Body,
  Controller,
  Get,
  Path,
  Post,
  Query,
  Route,
  SuccessResponse,
} from "tsoa";

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
    @Path() userId: number,
    @Query() name?: string,
  ): Promise<User> {
    return {
      id: userId,
      name: name,
    };
  }

  @SuccessResponse("201", "Created")
  @Post()
  public async createUser(
    @Body() requestBody: CreateUserRequest,
  ): Promise<void> {
    console.log(requestBody);
    this.setStatus(201);
  }
}
