import { defineConfig } from "orval";
import { env } from "./src/env";
import "dotenv/config";

export default defineConfig({
  "zanin-api": {
    input: "../services/api/build/swagger.json",
    output: {
      mode: "single",
      target: "./src/api.ts",
      client: "react-query",
      baseUrl: env.PUBLIC_SERVER_BASE_URL,
    },
  },
});
