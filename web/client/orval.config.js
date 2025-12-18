import { defineConfig } from "orval";
import "dotenv/config";

export default defineConfig({
  "zanin-api": {
    input: "../services/api/build/swagger.json",
    output: {
      mode: "single",
      target: "./src/api.ts",
      client: "react-query",
      baseUrl: process.env.SERVER_BASE_URL,
    },
  },
});
