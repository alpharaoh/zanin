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

@Route("users")
export class UsersController extends Controller {
  @Get("{userId}")
  public async getUser(
    @Path() userId: number,
    @Query() name?: string,
  ): Promise<any> {
    return {
      id: userId,
      name: name,
    };
  }

  @SuccessResponse("201", "Created")
  @Post()
  public async createUser(@Body() requestBody: any): Promise<void> {
    console.log(requestBody);
    this.setStatus(201);
  }
}
