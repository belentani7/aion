import { describe, expect, it, vi } from "vitest";
import { logValidationOutcome, sanitizeError, SlidingWindowRateLimiter } from "./observability";
import { validatePvcu } from "./pvcu";
import { createProvenanceRecord, fetchOpenMeteoWeather, getOpenDataSource } from "./open-data";

describe("platform controls", () => {
  it("enforces a sliding-window request budget", () => {
    const limiter = new SlidingWindowRateLimiter(2, 60_000);
    expect(limiter.consume("client").allowed).toBe(true);
    expect(limiter.consume("client").allowed).toBe(true);
    const blocked = limiter.consume("client");
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("sanitizes errors and emits validation outcomes without raw payloads", () => {
    const error = new Error("payment failed for user@example.com token Bearer secret-token 123456789");
    const sanitized = sanitizeError(error);
    expect(sanitized.message).not.toContain("user@example.com");
    expect(sanitized.message).not.toContain("secret-token");
    const evidence = validatePvcu({ operation: "employee.create", tenantId: 1, userId: 2, role: "manager", payload: { name: "Ana" }, correlationId: "corr-12345678" });
    expect(() => logValidationOutcome(evidence)).not.toThrow();
  });

  it("validates live weather schema and reuses a hash-only cache", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ current: { temperature_2m: 22.5, wind_speed_10m: 7, precipitation: 0 } }), { status: 200, headers: { "content-type": "application/json" } })));
    const first = await fetchOpenMeteoWeather({ location: "Madrid test", latitude: 40.4168, longitude: -3.7038, cacheTtlMs: 60_000 });
    const second = await fetchOpenMeteoWeather({ location: "Madrid test", latitude: 40.4168, longitude: -3.7038, cacheTtlMs: 60_000 });
    expect(first.current.temperatureC).toBe(22.5);
    expect(first.cacheHit).toBe(false);
    expect(second.cacheHit).toBe(true);
    expect(first.provenance.rawResponseStored).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it("creates provenance without storing raw external responses", () => {
    expect(getOpenDataSource("open-meteo")?.status).toBe("catalogued");
    const record = createProvenanceRecord({ sourceId: "open-meteo", response: { temperature: 21 }, schemaVersion: "weather.v1", cacheKey: "madrid:2026-08-15" });
    expect(record.rawResponseStored).toBe(false);
    expect(record.responseHash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(record)).not.toContain("temperature");
  });
});
