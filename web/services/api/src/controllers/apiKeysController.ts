import {
  Controller,
  Get,
  Post,
  Delete,
  Request,
  Response,
  Route,
  Security,
  Body,
  Path,
} from "tsoa";
import type { Request as ExpressRequest } from "express";
import { auth, fromNodeHeaders } from "@zanin/auth";

interface ApiKey {
  id: string;
  name: string | null;
  start: string | null;
  prefix: string | null;
  userId: string;
  enabled: boolean;
  expiresAt: string | null;
  createdAt: string;
}

interface ApiKeyWithSecret extends ApiKey {
  key: string;
}

interface CreateApiKeyRequest {
  name: string;
}

interface ListApiKeysResponse {
  apiKeys: ApiKey[];
}

@Security("default")
@Response(401, "Unauthorized")
@Response(400, "Bad Request")
@Response(500, "Internal Server Error")
@Route("v1/api-keys")
export class ApiKeysController extends Controller {
  /**
   * Create a new API key. The full key is only returned once upon creation.
   */
  @Post()
  public async createApiKey(
    @Request() request: ExpressRequest,
    @Body() body: CreateApiKeyRequest,
  ): Promise<ApiKeyWithSecret> {
    const { userId } = request.user!;

    const result = await auth.api.createApiKey({
      body: {
        name: body.name,
        userId,
      },
    });

    return {
      id: result.id,
      name: result.name,
      start: result.start,
      prefix: result.prefix,
      userId: result.userId,
      enabled: result.enabled,
      expiresAt: result.expiresAt?.toISOString() ?? null,
      createdAt: result.createdAt.toISOString(),
      key: result.key,
    };
  }

  /**
   * List all API keys for the current user. Keys are masked (only prefix shown).
   */
  @Get()
  public async listApiKeys(
    @Request() request: ExpressRequest,
  ): Promise<ListApiKeysResponse> {
    const result = await auth.api.listApiKeys({
      headers: fromNodeHeaders(request.headers),
    });

    const apiKeys = (result ?? []).map((key) => ({
      id: key.id,
      name: key.name,
      start: key.start,
      prefix: key.prefix,
      userId: key.userId,
      enabled: key.enabled,
      expiresAt: key.expiresAt?.toISOString() ?? null,
      createdAt: key.createdAt.toISOString(),
    }));

    return { apiKeys };
  }

  /**
   * Delete an API key (revoke access).
   */
  @Delete("{keyId}")
  public async deleteApiKey(
    @Request() request: ExpressRequest,
    @Path() keyId: string,
  ): Promise<{ success: boolean }> {
    await auth.api.deleteApiKey({
      body: { keyId },
      headers: fromNodeHeaders(request.headers),
    });

    return { success: true };
  }
}
