import { defineConfig } from "orval";

export default defineConfig({
  "zanin-api": {
    input: "../services/api/build/swagger.json",
    output: {
      mode: "split",
      target: "./src/api.ts",
      schemas: "src/model",
      client: "react-query",
    },
  },
});
