import { describe, expect, it } from "vitest";
import { redactSecrets, resolveWorkspacePath, runSafeCommand } from "./aion/safeExecutor";

describe("AION safe executor", () => {
  it("rejects paths outside the workspace roots", () => {
    expect(() => resolveWorkspacePath("/etc/passwd")).toThrow("Ruta fuera");
  });
  it("redacts credential-like values", () => {
    expect(redactSecrets("api_key=top-secret token:abc123")).toContain("[REDACTED]");
    expect(redactSecrets("api_key=top-secret")).not.toContain("top-secret");
  });
  it("requires approval before process execution", async () => {
    const result = await runSafeCommand("node", ["-e", "console.log('ok')"], "/home/ubuntu/aion");
    expect(result.status).toBe("blocked");
    expect(result.approvalRequired).toBe(true);
  });
});
