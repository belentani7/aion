import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const ctx = { user: undefined, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] } as TrpcContext;

describe("AION security contracts", () => {
  it("keeps the network and managed provider disabled by default", async () => {
    const dashboard = await appRouter.createCaller(ctx).aion.dashboard();
    expect(dashboard.network).toBe("OFF");
    expect(dashboard.externalProviders).toBe("DISABLED");
    expect(dashboard.tools.find(tool => tool.name === "managed_llm")?.status).toBe("disabled_by_default");
  });

  it("exposes risky tools as explicit NOT IMPLEMENTED capabilities", async () => {
    const dashboard = await appRouter.createCaller(ctx).aion.dashboard();
    const terminal = dashboard.tools.find(tool => tool.name === "terminal");
    expect(terminal?.riskLevel).toBe("high");
    expect(terminal?.status).toBe("available");
    expect(terminal?.permissions).toContain("workspace.exec");
  });
});
