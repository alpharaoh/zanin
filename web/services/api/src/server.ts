import express, { json, urlencoded, Response, Request } from "express";
import swaggerUi from "swagger-ui-express";
import pino from "pino-http";
import cors from "cors";
import { env } from "@zanin/env/server";
import { RegisterRoutes } from "../build/routes";
import { errorHandler } from "./handlers/errorHandler";
import { inngestHandler } from "./handlers/inngestHandler";
import { notFoundHandler } from "./handlers/notFoundHandler";
import { authMiddleware } from "@zanin/auth";

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
app.use(json({ limit: "200mb" }));
app.use("/docs", swaggerUi.serve, async (_: Request, res: Response) => {
  return res.send(
    swaggerUi.generateHTML(await import("../build/swagger.json")),
  );
});
app.use("/api/inngest", inngestHandler);

RegisterRoutes(app);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.PORT, () =>
  console.log(`Zanin API listening at http://localhost:${env.PORT}`),
);
