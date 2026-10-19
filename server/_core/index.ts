import "dotenv/config";
import express from "express";
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import path from "node:path";
import { createApp } from "./app";

async function startServer() {
  const app = createApp();
  const server = createServer(app);
  if (process.env.NODE_ENV === "development") {
    const { setupVite } = await import("./vite");
    await setupVite(app, server);
  } else {
    const publicDir = path.resolve(import.meta.dirname, "public");
    if (!existsSync(path.join(publicDir, "index.html"))) {
      throw new Error("Frontend build missing; run npm run build before npm start");
    }
    app.use(express.static(publicDir));
    app.get(/.*/, (_req, res) => res.sendFile("index.html", { root: publicDir }));
  }
  const port = Number(process.env.PORT || "3000");
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid PORT");
  server.listen(port, "0.0.0.0", () => console.log(`Aion HTTP server listening on port ${port}`));
  server.on("error", () => { console.error("HTTP server could not start"); process.exitCode = 1; });
}
startServer().catch(() => { console.error("Aion startup failed; verify build and configuration"); process.exitCode = 1; });
