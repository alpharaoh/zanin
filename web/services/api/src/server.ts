import cors from "cors";
import express, { json, urlencoded, Response, Request } from "express";
import { RegisterRoutes } from "../build/routes";
import swaggerUi from "swagger-ui-express";
import { errorHandler } from "./handlers/errorHandler";
import { notFoundHandler } from "./handlers/notFoundHandler";
import { authMiddleware } from "@zanin/db/auth";
import pino from "pino-http";

export const app = express();

app.use(pino());
app.use(
  cors({
    origin: "http://localhost:8080",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
    credentials: true, // Allow credentials (cookies, authorization headers, etc.)
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

const port = process.env.PORT || 8081;

app.listen(port, () =>
  console.log(`Zanin API listening at http://localhost:${port}`),
);
