import { NextFunction, Request, Response } from "express";
import { success } from "../types/response";

export const responseHandler = (
  _req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const originalJson = res.json.bind(res);

  res.json = (body: unknown) => {
    // Don't wrap if already in envelope format
    if (body && typeof body === "object" && "data" in body && "error" in body) {
      return originalJson(body);
    }

    return originalJson(success(body));
  };

  next();
};
