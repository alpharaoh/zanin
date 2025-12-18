import { NextFunction, Request, Response } from "express";
import { ValidateError } from "tsoa";

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
    return res.status(422).json({
      message: "Validation Failed",
      details: err?.fields,
    });
  }

  if (err instanceof Error) {
    if (err.message === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    req.log.error(err);
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }

  next();
};
