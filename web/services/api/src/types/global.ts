import type { Logger } from "pino";
import { AuthenticatedUser } from "./user";

declare global {
  namespace Express {
    interface Request {
      log: Logger;
      user?: AuthenticatedUser;
    }
  }
}
