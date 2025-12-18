import {
  Body,
  Controller,
  Get,
  Path,
  Post,
  Query,
  Request,
  Route,
  Security,
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
@Security("default")
export class UsersController extends Controller {
  /**
   * Retrieves the details of an existing user.
   * Supply the unique user ID from either and receive corresponding user details.
   * @param userId The unique user ID.
   * @param name The name of the user.
   */
  @Get("{userId}")
  public async getUser(
    @Request() request: Request,
    @Path() userId: number,
    @Query() name?: string,
  ): Promise<User> {
    console.log("\n\n", request?.user);

    return {
      id: 1,
      name: "zanin",
    };
  }

  /**
   * Retrieves the details of an existing user.
   * Supply the unique user ID from either and receive corresponding user details.
   */
  @SuccessResponse("201", "Created")
  @Post()
  public async createUser(
    @Body() requestBody: CreateUserRequest,
  ): Promise<void> {
    this.setStatus(201);
  }
}
