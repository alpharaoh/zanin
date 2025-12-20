import { Request, Response } from "express";
import { error } from "../types/response";

export const notFoundHandler = (_: Request, res: Response): Response | void => {
  res.status(404).json(error("Not Found", 404));
};
