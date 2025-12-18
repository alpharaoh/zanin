import { env } from "@zanin/env/server";
import cors from "cors";
import express, { json, urlencoded, Response, Request } from "express";
import { RegisterRoutes } from "../build/routes";
import swaggerUi from "swagger-ui-express";
import { errorHandler } from "./handlers/errorHandler";
import { notFoundHandler } from "./handlers/notFoundHandler";
import { authMiddleware } from "@zanin/auth";
import pino from "pino-http";

export const app = express();

app.use(
  pino({
    redact: {
      paths:
        env.NODE_ENV === "production" ? ["req.headers.cookie"] : ["req", "res"],
      remove: true,
    },
  }),
);
app.use(
  cors({
    origin: env.CLIENT_URL,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
    credentials: true,
  }),
);
app.use(
  urlencoded({
    extended: true,
  }),
);
app.all("/api/auth/*splat", authMiddleware);
app.use(json());
app.use("/docs", swaggerUi.serve, async (_: Request, res: Response) => {
  return res.send(
    swaggerUi.generateHTML(await import("../build/swagger.json")),
  );
});

RegisterRoutes(app);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.PORT, () =>
  console.log(`Zanin API listening at http://localhost:${env.PORT}`),
);
