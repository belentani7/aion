import { randomUUID } from "node:crypto";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { ValidationEvidence } from "./pvcu";

export function correlationId(req: Request): string {
  const incoming = req.header("x-request-id")?.trim();
  return incoming && /^[A-Za-z0-9._:-]{8,128}$/.test(incoming) ? incoming : randomUUID();
}

function sanitizeText(value: string): string {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, "Bearer [REDACTED]")
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[EMAIL_REDACTED]")
    .replace(/\b\d{8,}\b/g, "[LONG_NUMBER_REDACTED]")
    .slice(0, 500);
}

export function sanitizeError(error: unknown): { name: string; code?: string; message: string } {
  if (error instanceof Error) {
    const code = typeof (error as Error & { code?: unknown }).code === "string"
      ? sanitizeText(String((error as Error & { code?: unknown }).code))
      : undefined;
    return { name: sanitizeText(error.name), code, message: sanitizeText(error.message) };
  }
  return { name: "UnknownError", message: sanitizeText(String(error)) };
}

export function logSanitizedError(error: unknown, context: { operation: string; correlationId?: string; requestId?: string }): void {
  console.warn(JSON.stringify({
    event: "operation.error",
    operation: sanitizeText(context.operation),
    correlationId: context.correlationId,
    requestId: context.requestId,
    error: sanitizeError(error),
    timestamp: new Date().toISOString(),
  }));
}

export function logValidationOutcome(evidence: Pick<ValidationEvidence, "validationId" | "correlationId" | "operation" | "riskClass" | "profileId" | "profileVersion" | "layers" | "result" | "failureMode" | "evidenceHash" | "findings">): void {
  console.info(JSON.stringify({
    event: "pvcu.validation.completed",
    validationId: evidence.validationId,
    correlationId: evidence.correlationId,
    operation: sanitizeText(evidence.operation),
    riskClass: evidence.riskClass,
    profileId: evidence.profileId,
    profileVersion: evidence.profileVersion,
    layers: evidence.layers,
    result: evidence.result,
    failureMode: evidence.failureMode,
    evidenceHash: evidence.evidenceHash,
    findings: evidence.findings.slice(0, 12).map(sanitizeText),
    timestamp: new Date().toISOString(),
  }));
}

export function requestObservability(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const id = correlationId(req);
    const startedAt = performance.now();
    res.setHeader("x-request-id", id);
    res.on("finish", () => {
      const durationMs = Math.round((performance.now() - startedAt) * 100) / 100;
      console.info(JSON.stringify({
        event: "http.request.completed",
        requestId: id,
        correlationId: id,
        method: req.method,
        route: req.path,
        status: res.statusCode,
        durationMs,
        timestamp: new Date().toISOString(),
      }));
    });
    next();
  };
}

export class SlidingWindowRateLimiter {
  private readonly windows = new Map<string, { startedAt: number; count: number }>();

  constructor(private readonly maxRequests: number, private readonly windowMs: number) {}

  consume(key: string): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
    const now = Date.now();
    const current = this.windows.get(key);
    if (!current || now - current.startedAt >= this.windowMs) {
      this.windows.set(key, { startedAt: now, count: 1 });
      return { allowed: true, remaining: this.maxRequests - 1, retryAfterSeconds: Math.ceil(this.windowMs / 1000) };
    }
    current.count += 1;
    const remaining = Math.max(0, this.maxRequests - current.count);
    return {
      allowed: current.count <= this.maxRequests,
      remaining,
      retryAfterSeconds: Math.max(1, Math.ceil((this.windowMs - (now - current.startedAt)) / 1000)),
    };
  }

  prune(): void {
    const cutoff = Date.now() - this.windowMs;
    this.windows.forEach((window, key) => { if (window.startedAt < cutoff) this.windows.delete(key); });
  }
}

export const publicAuditRateLimiter = new SlidingWindowRateLimiter(60, 60_000);
