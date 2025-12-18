import type { Logger } from "pino";
import { Session } from "./user";

declare global {
  namespace Express {
    interface Request {
      log: Logger;
      user: Session;
    }
  }
}
