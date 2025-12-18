import type { Logger } from "pino";
import { UserSession } from "./user";

declare global {
  namespace Express {
    interface Request {
      log: Logger;
      user: UserSession;
    }
  }
}
