import { watch } from "fs";
import { spawn, type Subprocess } from "bun";
import { join } from "path";

const controllersDir = join(import.meta.dir, "controllers");

async function runTsoa() {
  console.log("Regenerating tsoa routes...");
  const proc = spawn(["bun", "run", "tsoa", "spec-and-routes"], {
    cwd: join(import.meta.dir, ".."),
    stdout: "inherit",
    stderr: "inherit",
  });
  await proc.exited;
}

let server: Subprocess | null = null;

async function startServer() {
  if (server) {
    server.kill();
  }
  server = spawn(["bun", "--hot", "run", join(import.meta.dir, "server.ts")], {
    cwd: join(import.meta.dir, ".."),
    stdout: "inherit",
    stderr: "inherit",
  });
}

// Initial build and start
await runTsoa();
await startServer();

// Watch controllers for changes
watch(controllersDir, { recursive: true }, async (_, filename) => {
  if (filename?.endsWith(".ts")) {
    await runTsoa();
    await startServer();
  }
});
