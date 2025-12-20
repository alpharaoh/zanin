import { NextFunction, Request, Response } from "express";
import { ValidateError } from "tsoa";
import { HttpError } from "../errors";
import { error } from "../types/response";

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
): Response | void => {
  if (err instanceof ValidateError) {
    req.log.warn(
      `Caught Validation Error for ${req.path}: ${JSON.stringify(err.fields)}`,
    );
    return res.status(422).json(error("Validation Failed", 422));
  }

  if (err instanceof HttpError) {
    if (err.statusCode >= 500) {
      req.log.error(err);
    }
    return res.status(err.statusCode).json(error(err.message, err.statusCode));
  }

  if (err instanceof Error) {
    req.log.error(err);
    return res.status(500).json(error("Internal Server Error", 500));
  }

  next();
};
