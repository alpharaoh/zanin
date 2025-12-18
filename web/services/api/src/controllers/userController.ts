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
import { selectOrganization } from "@zanin/db/queries/select/selectOrganization";

interface User {
  id: number;
  name?: string;
}

interface CreateUserRequest {
  name: string;
}

@Route("users")
export class UsersController extends Controller {
  /**
   * Retrieves the details of an existing user.
   * Supply the unique user ID from either and receive corresponding user details.
   * @param userId The unique user ID.
   * @param name The name of the user.
   */
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

  /**
   * Retrieves the details of an existing user.
   * Supply the unique user ID from either and receive corresponding user details.
   */
  @SuccessResponse("201", "Created")
  @Post()
  public async createUser(
    @Body() requestBody: CreateUserRequest,
  ): Promise<void> {
    console.log(requestBody);
    const organization = await selectOrganization("123");
    console.log(organization);
    this.setStatus(201);
  }
}
