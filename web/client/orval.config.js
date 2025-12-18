import { defineConfig } from "orval";

export default defineConfig({
  "zanin-api": {
    input: "../services/api/build/swagger.json",
    output: {
      mode: "single",
      target: "./src/api.ts",
      client: "react-query",
      override: {
        mutator: {
          path: "./src/lib/axios.ts",
          name: "axios",
        },
      },
    },
  },
});
