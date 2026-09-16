import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const anonymousContext = {
  user: null,
  req: {} as TrpcContext["req"],
  res: {} as TrpcContext["res"],
} as TrpcContext;

const authenticatedContext = {
  user: {
    id: 1,
    openId: "aion-security-test",
    email: "aion@example.com",
    name: "AION Test User",
    loginMethod: "test",
    role: "user" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  },
  req: {} as TrpcContext["req"],
  res: {} as TrpcContext["res"],
} as TrpcContext;

describe("AION security contracts", () => {
  it("denies anonymous access to the AION control plane", async () => {
    const caller = appRouter.createCaller(anonymousContext);

    await expect(caller.aion.dashboard()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(
      caller.aion.importProject({ name: "anonymous", sourcePath: "/tmp", sourceType: "path" }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("keeps the network and managed provider disabled by default", async () => {
    const dashboard = await appRouter.createCaller(authenticatedContext).aion.dashboard();
    expect(dashboard.network).toBe("OFF");
    expect(dashboard.externalProviders).toBe("DISABLED");
    expect(dashboard.tools.find(tool => tool.name === "managed_llm")?.status).toBe("disabled_by_default");
  });

  it("exposes risky tools with explicit approval requirements", async () => {
    const dashboard = await appRouter.createCaller(authenticatedContext).aion.dashboard();
    const terminal = dashboard.tools.find(tool => tool.name === "terminal");
    expect(terminal?.riskLevel).toBe("high");
    expect(terminal?.status).toBe("available");
    expect(terminal?.permissions).toContain("workspace.exec");
  });
});

export { authenticatedContext };
