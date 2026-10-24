import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { defaultProfile } from "./pvcu";
import { openDataSources } from "./open-data";

const context = (loggedIn: boolean) => ({
  user: loggedIn ? {
    id: 99,
    openId: "validation-test",
    email: "validation@example.invalid",
    name: "Validation Test",
    loginMethod: "test",
    role: "user" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  } : null,
  req: {} as TrpcContext["req"],
  res: {} as TrpcContext["res"],
}) satisfies TrpcContext;

describe("authenticated PVC-U configuration catalogue", () => {
  it("rejects unauthenticated reads of both catalogue endpoints", async () => {
    const caller = appRouter.createCaller(context(false));
    await expect(caller.validation.profiles()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.validation.openDataSources()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("returns four real versioned profile definitions, not synthetic results", async () => {
    const result = await appRouter.createCaller(context(true)).validation.profiles();
    expect(result.map(p => p.riskClass)).toEqual(["low", "medium", "high", "critical"]);
    expect(result).toEqual((["low", "medium", "high", "critical"] as const).map(defaultProfile));
    expect(result.every(p => p.status === "active" && p.version === "1.0.0")).toBe(true);
  });

  it("returns catalogued sources without making external HTTP requests", async () => {
    const outbound = vi.spyOn(globalThis, "fetch");
    const result = await appRouter.createCaller(context(true)).validation.openDataSources();
    expect(result).toEqual(openDataSources);
    expect(result).toHaveLength(3);
    expect(result.every(s => s.status === "catalogued")).toBe(true);
    expect(outbound).not.toHaveBeenCalled();
    outbound.mockRestore();
  });
});
