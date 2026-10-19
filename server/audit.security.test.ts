import { describe, expect, it } from "vitest";
import { LedgerService } from "./ledger.service";
import { requireRole, type TenantAccess } from "./tenant-context";

const date = new Date("2026-01-01T00:00:00.000Z");

function access(role: TenantAccess["membership"]["role"]): TenantAccess {
  return {
    tenant: { id: 1, name: "Tenant A", stripeCustomerId: null, stripeSubscriptionId: null, plan: "pro", createdAt: date, updatedAt: date },
    membership: { id: 1, tenantId: 1, userId: 1, role, status: "active", createdAt: date, updatedAt: date },
  };
}

describe("AION audit security primitives", () => {
  it("generates the same SHA-256 hash for the same canonical input", () => {
    const input = { previousHash: null, eventType: "shift_created", payload: { b: 2, a: 1 }, createdAt: date };
    expect(LedgerService.computeHash(input)).toBe(LedgerService.computeHash({ ...input, payload: { a: 1, b: 2 } }));
  });

  it("changes the hash when the previous link changes", () => {
    const base = { eventType: "shift_created", payload: { id: 1 }, createdAt: date };
    expect(LedgerService.computeHash({ ...base, previousHash: null })).not.toBe(LedgerService.computeHash({ ...base, previousHash: "a".repeat(64) }));
  });

  it("accepts only the required role or a stronger role", () => {
    expect(() => requireRole(access("manager"), "manager")).not.toThrow();
    expect(() => requireRole(access("admin"), "manager")).not.toThrow();
    expect(() => requireRole(access("employee"), "manager")).toThrowError(/requiere rol manager/);
  });
});
