import dotenv from "dotenv";
import path from "path";
import { defineConfig } from "drizzle-kit";

// Load .env from monorepo root
dotenv.config({ path: path.resolve(import.meta.dir, "../../.env") });

export default defineConfig({
  out: "./drizzle",
  schema: "./src/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
