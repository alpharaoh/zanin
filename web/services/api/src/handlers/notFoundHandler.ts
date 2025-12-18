import { Request, Response } from "express";

export const notFoundHandler = (_: Request, res: Response): Response | void => {
  res.status(404).json({
    message: "Not Found",
  });
};
