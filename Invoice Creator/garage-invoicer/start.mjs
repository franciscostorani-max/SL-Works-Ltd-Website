#!/usr/bin/env node
/**
 * start.mjs — builds the frontend and starts the app with a public tunnel.
 * Run with: node start.mjs
 */

import { execSync, spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 1. Build the frontend
console.log("Building frontend…");
execSync("npm run build", {
  cwd: path.join(__dirname, "frontend"),
  stdio: "inherit",
});

// 2. Start the backend
const server = spawn(
  "node",
  ["--env-file=.env", "server.js"],
  {
    cwd: path.join(__dirname, "backend"),
    stdio: "inherit",
    env: { ...process.env },
  }
);

server.on("error", (err) => {
  console.error("Server failed to start:", err.message);
  process.exit(1);
});

// 3. Wait for server to be ready, then open tunnel
await new Promise((r) => setTimeout(r, 2000));

try {
  const { default: localtunnel } = await import("localtunnel");
  const tunnel = await localtunnel({ port: 4000 });

  console.log("\n================================================");
  console.log("  App is LIVE — open this URL on any device:");
  console.log(`  ${tunnel.url}`);
  console.log("================================================\n");

  tunnel.on("close", () => {
    console.log("Tunnel closed.");
  });
  tunnel.on("error", (err) => {
    console.error("Tunnel error:", err.message);
  });
} catch (err) {
  console.error("Could not open tunnel:", err.message);
  console.log("App is still running locally at http://localhost:4000");
}

process.on("SIGINT", () => {
  server.kill();
  process.exit(0);
});
