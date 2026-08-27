import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { deleteProjectData } from "./db";
import type { TrpcContext } from "./_core/context";

const ctx = { user: undefined, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] } as TrpcContext;

describe("AION audit workflow", () => {
  it("imports a real workspace, creates a plan, audits it, and persists the trail", async () => {
    const caller = appRouter.createCaller(ctx);
    const imported = await caller.aion.importProject({ name: `AION E2E ${Date.now()}`, sourcePath: "/home/ubuntu/aion", sourceType: "server_path" });
    expect(imported.status).toBe("ready");
    if (imported.status !== "ready") return;
    try {
      const planned = await caller.aion.plan({ projectId: imported.projectId });
      expect(planned.tasks.length).toBeGreaterThanOrEqual(4);
      const audited = await caller.aion.audit({ projectId: imported.projectId });
      expect(audited.project.id).toBe(imported.projectId);
      expect((await caller.aion.executions({ projectId: imported.projectId })).length).toBeGreaterThanOrEqual(3);
      expect((await caller.aion.memory({ projectId: imported.projectId })).length).toBeGreaterThanOrEqual(1);
    } finally { await deleteProjectData(imported.projectId); }
  }, 15000);
});
