import cors from "cors";
import express, { json, urlencoded, Response, Request } from "express";
import { RegisterRoutes } from "../build/routes";
import swaggerUi from "swagger-ui-express";
import { errorHandler } from "./handlers/errorHandler";
import { notFoundHandler } from "./handlers/notFoundHandler";

export const app = express();

app.use(cors());
app.use(
  urlencoded({
    extended: true,
  }),
);
app.use(json());
app.use("/docs", swaggerUi.serve, async (_: Request, res: Response) => {
  return res.send(
    swaggerUi.generateHTML(await import("../build/swagger.json")),
  );
});

RegisterRoutes(app);

app.use(notFoundHandler);
app.use(errorHandler);
