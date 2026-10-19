import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import path from "path";
import { fileURLToPath } from "url";
import { setupVite, serveStatic } from "./vite";
import { createContext } from "./context";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { handleStripeWebhook } from "../stripe.webhook";
import { LedgerService } from "../ledger.service";
import { SlidingWindowRateLimiter, logSanitizedError, publicAuditRateLimiter, requestObservability } from "../observability";
import { sdk } from "./sdk";
import { resolveTenantAccess } from "../tenant-context";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_CLIENT_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"];

function resolveAllowedOrigins(): string[] {
  const configured = (process.env.CLIENT_ORIGIN ?? process.env.CLIENT_ORIGINS ?? "")
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean);
  return configured.length > 0 ? configured : DEFAULT_CLIENT_ORIGINS;
}

const trpcRateLimiter = new SlidingWindowRateLimiter(300, 60_000);

function trpcRateLimit(req: Request, res: Response, next: NextFunction) {
  const rate = trpcRateLimiter.consume(req.ip ?? req.socket.remoteAddress ?? "unknown");
  res.setHeader("X-RateLimit-Remaining", String(rate.remaining));
  res.setHeader("X-RateLimit-Limit", "300");
  if (!rate.allowed) {
    res.setHeader("Retry-After", String(rate.retryAfterSeconds));
    res.status(429).json({ error: "Rate limit exceeded", retryAfterSeconds: rate.retryAfterSeconds });
    return;
  }
  next();
}

async function startServer() {
  const app = express();
  app.use(requestObservability());
  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => callback(null, !origin || resolveAllowedOrigins().includes(origin)),
      credentials: true,
    })
  );
  const server = createServer(app);

  // Health check — DB connectivity, uptime, version
  const serverStartTime = Date.now();
  app.get("/api/health", async (_req, res) => {
    const { getDb } = await import("../db");
    const db = await getDb();
    let dbStatus = "disconnected";
    if (db) {
      try {
        await db.execute("SELECT 1");
        dbStatus = "connected";
      } catch {
        dbStatus = "error";
      }
    }
    const status = dbStatus === "connected" ? "healthy" : "degraded";
    res.status(status === "healthy" ? 200 : 503).json({
      status,
      service: "aion-unified",
      version: "1.0.0",
      uptime_seconds: Math.round((Date.now() - serverStartTime) / 1000),
      database: dbStatus,
      compliance_api: process.env.COMPLIANCE_API_URL || "http://compliance:8080",
      scheduling_api: process.env.SCHEDULING_API_URL || "http://scheduling:8081",
      diligence_api: process.env.DILIGENCE_API_URL || "http://diligence:8082",
      timestamp: new Date().toISOString(),
    });
  });

  // Compliance API proxy — forward validation requests to Python FastAPI service
  const COMPLIANCE_API = process.env.COMPLIANCE_API_URL || "http://compliance:8080";

  app.post("/api/compliance/validate", express.json(), async (req, res) => {
    try {
      const response = await fetch(`${COMPLIANCE_API}/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body),
      });
      const data = await response.json();
      res.status(response.status).json(data);
    } catch (error) {
      logSanitizedError(error, { operation: "compliance.proxy.validate" });
      res.status(502).json({ error: "Compliance service unavailable" });
    }
  });

  app.get("/api/compliance/rules", async (req, res) => {
    try {
      const jurisdiction = req.query.jurisdiction || "ES";
      const response = await fetch(`${COMPLIANCE_API}/rules?jurisdiction=${jurisdiction}`);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      logSanitizedError(error, { operation: "compliance.proxy.rules" });
      res.status(502).json({ error: "Compliance service unavailable" });
    }
  });

  app.get("/api/compliance/jurisdictions", async (_req, res) => {
    try {
      const response = await fetch(`${COMPLIANCE_API}/jurisdictions`);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      logSanitizedError(error, { operation: "compliance.proxy.jurisdictions" });
      res.status(502).json({ error: "Compliance service unavailable" });
    }
  });

  app.post("/api/compliance/metrics", express.json(), async (req, res) => {
    try {
      const response = await fetch(`${COMPLIANCE_API}/metrics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body),
      });
      const data = await response.json();
      res.status(response.status).json(data);
    } catch (error) {
      logSanitizedError(error, { operation: "compliance.proxy.metrics" });
      res.status(502).json({ error: "Compliance service unavailable" });
    }
  });

  // Scheduling API proxy — forward to Python OR-Tools scheduling service
  const SCHEDULING_API = process.env.SCHEDULING_API_URL || "http://scheduling:8081";

  const schedulingProxyPost = (endpoint: string) => {
    app.post(`/api/scheduling/${endpoint}`, express.json(), async (req, res) => {
      try {
        const response = await fetch(`${SCHEDULING_API}/${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(req.body),
        });
        const data = await response.json();
        res.status(response.status).json(data);
      } catch (error) {
        logSanitizedError(error, { operation: `scheduling.proxy.${endpoint}` });
        res.status(502).json({ error: "Scheduling service unavailable" });
      }
    });
  };

  schedulingProxyPost("demand");
  schedulingProxyPost("optimize");
  schedulingProxyPost("roster");
  schedulingProxyPost("fairness");

  app.get("/api/scheduling/capabilities", async (_req, res) => {
    try {
      const response = await fetch(`${SCHEDULING_API}/capabilities`);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      logSanitizedError(error, { operation: "scheduling.proxy.capabilities" });
      res.status(502).json({ error: "Scheduling service unavailable" });
    }
  });

  app.get("/api/scheduling/health", async (_req, res) => {
    try {
      const response = await fetch(`${SCHEDULING_API}/health`);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      logSanitizedError(error, { operation: "scheduling.proxy.health" });
      res.status(502).json({ error: "Scheduling service unavailable" });
    }
  });

  // Diligence Protocol proxy — forward to Python due diligence service
  const DILIGENCE_API = process.env.DILIGENCE_API_URL || "http://diligence:8082";

  const diligenceProxyPost = (endpoint: string) => {
    app.post(`/api/diligence/${endpoint}`, express.json(), async (req, res) => {
      try {
        const response = await fetch(`${DILIGENCE_API}/${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(req.body),
        });
        const data = await response.json();
        res.status(response.status).json(data);
      } catch (error) {
        logSanitizedError(error, { operation: `diligence.proxy.${endpoint}` });
        res.status(502).json({ error: "Diligence service unavailable" });
      }
    });
  };

  const diligenceProxyGet = (endpoint: string) => {
    app.get(`/api/diligence/${endpoint}`, async (req, res) => {
      try {
        const url = new URL(`${DILIGENCE_API}/${endpoint}`);
        for (const [k, v] of Object.entries(req.query)) {
          if (typeof v === "string") url.searchParams.set(k, v);
        }
        const response = await fetch(url.toString());
        const data = await response.json();
        res.status(response.status).json(data);
      } catch (error) {
        logSanitizedError(error, { operation: `diligence.proxy.${endpoint}` });
        res.status(502).json({ error: "Diligence service unavailable" });
      }
    });
  };

  diligenceProxyPost("risk/assess");
  diligenceProxyPost("risk/compliance");
  diligenceProxyPost("risk/fairness");
  diligenceProxyPost("risk/documents");
  diligenceProxyPost("workflows/create");
  diligenceProxyPost("workflows/advance");
  diligenceProxyPost("reports/risk");
  diligenceProxyPost("reports/compliance");
  diligenceProxyPost("reports/workflows");
  diligenceProxyPost("reports/trend");
  diligenceProxyGet("workflows/templates");
  diligenceProxyGet("workflows");
  diligenceProxyGet("regulations");
  diligenceProxyGet("regulations/all");
  diligenceProxyGet("capabilities");
  diligenceProxyGet("health");

  // Dynamic workflow routes (with path params)
  app.get("/api/diligence/workflows/:id", async (req, res) => {
    try {
      const response = await fetch(`${DILIGENCE_API}/workflows/${req.params.id}`);
      const data = await response.json();
      res.status(response.status).json(data);
    } catch (error) {
      logSanitizedError(error, { operation: "diligence.proxy.workflow.get" });
      res.status(502).json({ error: "Diligence service unavailable" });
    }
  });

  app.get("/api/diligence/workflows/:id/summary", async (req, res) => {
    try {
      const response = await fetch(`${DILIGENCE_API}/workflows/${req.params.id}/summary`);
      const data = await response.json();
      res.status(response.status).json(data);
    } catch (error) {
      logSanitizedError(error, { operation: "diligence.proxy.workflow.summary" });
      res.status(502).json({ error: "Diligence service unavailable" });
    }
  });

  // Stripe requires the raw request bytes for signature verification. Register before express.json().
  app.post(["/api/stripe/webhook", "/api/webhook/stripe"], express.raw({ type: "application/json" }), handleStripeWebhook);

  app.get("/api/audit/verify", async (req, res) => {
    const tenantId = Number(req.query.tenantId);
    const limit = Math.min(1000, Math.max(1, Number(req.query.limit ?? 1000)));
    const rateKey = `${req.ip}:${tenantId}`;
    const rate = publicAuditRateLimiter.consume(rateKey);
    res.setHeader("X-RateLimit-Remaining", String(rate.remaining));
    res.setHeader("X-RateLimit-Limit", "60");
    if (!rate.allowed) {
      res.setHeader("Retry-After", String(rate.retryAfterSeconds));
      res.status(429).json({ error: "Audit verification rate limit exceeded", retryAfterSeconds: rate.retryAfterSeconds });
      return;
    }
    if (!Number.isInteger(tenantId) || tenantId <= 0) {
      res.status(400).json({ error: "tenantId must be a positive integer" });
      return;
    }

    let user;
    try {
      user = await sdk.authenticateRequest(req);
    } catch {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    try {
      await resolveTenantAccess(user, tenantId);
    } catch (error) {
      logSanitizedError(error, { operation: "audit.verify.authorize", requestId: String(res.getHeader("x-request-id") ?? "") });
      res.status(403).json({ error: "No access to requested tenant" });
      return;
    }

    try {
      const result = await LedgerService.getPublicAuditChain(tenantId, Number.isFinite(limit) ? limit : 1000);
      res.setHeader("Cache-Control", "private, no-store");
      res.json(result);
    } catch (error) {
      logSanitizedError(error, { operation: "audit.verify", requestId: String(res.getHeader("x-request-id") ?? "") });
      res.status(503).json({ error: "Audit chain unavailable" });
    }
  });

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // tRPC middleware
  app.use(
    "/api/trpc",
    trpcRateLimit,
    createExpressMiddleware({
      router: appRouter,
      createContext,
      onError: ({ error, path: trpcPath }) => {
        logSanitizedError(error, { operation: `trpc.${trpcPath ?? "unknown"}` });
      },
    })
  );

  // Setup Vite or static serving
  const isDev = process.env.NODE_ENV === "development";
  if (isDev) {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // WebSocket server for real-time notifications
  const wss = new WebSocketServer({ server, path: "/ws" });
  const clients = new Map<WebSocket, { tenantId?: number; userId?: number }>();

  wss.on("connection", (ws) => {
    clients.set(ws, {});

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "subscribe" && msg.tenantId) {
          clients.set(ws, { tenantId: msg.tenantId, userId: msg.userId });
          ws.send(JSON.stringify({ type: "subscribed", tenantId: msg.tenantId }));
        }
      } catch {
        // ignore malformed messages
      }
    });

    ws.on("close", () => clients.delete(ws));
    ws.on("error", () => clients.delete(ws));

    ws.send(JSON.stringify({ type: "connected", timestamp: new Date().toISOString() }));
  });

  // Broadcast helper — available to other modules via global
  (globalThis as any).__aion_broadcast = (tenantId: number, event: { type: string; [key: string]: unknown }) => {
    const payload = JSON.stringify({ ...event, timestamp: new Date().toISOString() });
    for (const [ws, meta] of clients) {
      if (meta.tenantId === tenantId && ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    }
  };

  // SSE endpoint for clients that prefer Server-Sent Events
  app.get("/api/events", (req, res) => {
    const tenantId = Number(req.query.tenantId);
    if (!tenantId) {
      res.status(400).json({ error: "tenantId required" });
      return;
    }
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);

    const heartbeat = setInterval(() => res.write(": heartbeat\n\n"), 30_000);

    const originalBroadcast = (globalThis as any).__aion_broadcast;
    const handler = (tid: number, event: any) => {
      if (tid === tenantId) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    };

    const wrappedBroadcast = (tid: number, event: any) => {
      originalBroadcast?.(tid, event);
      handler(tid, event);
    };
    (globalThis as any).__aion_broadcast = wrappedBroadcast;

    req.on("close", () => {
      clearInterval(heartbeat);
      (globalThis as any).__aion_broadcast = originalBroadcast;
    });
  });

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}/`);
    console.log(`WebSocket available at ws://localhost:${PORT}/ws`);
    console.log(`SSE available at http://localhost:${PORT}/api/events?tenantId=N`);
  });
}

startServer().catch(console.error);
