import { describe, expect, it } from "vitest";
import { canonicalize, classifyRisk, defaultProfile, sha256, validatePvcu, verifyEvidenceChain } from "./pvcu";

describe("PVC-U universal validation engine", () => {
  it("canonicalizes object keys deterministically", () => {
    expect(canonicalize({ b: 2, a: 1 })).toBe(canonicalize({ a: 1, b: 2 }));
    expect(sha256({ b: 2, a: 1 })).toBe(sha256({ a: 1, b: 2 }));
  });

  it("classifies high and critical operations", () => {
    expect(classifyRisk("payroll.calculate")).toBe("high");
    expect(classifyRisk("stripe.checkout.create")).toBe("critical");
    expect(classifyRisk("dashboard.stats")).toBe("low");
  });

  it("allows a valid manager operation with tenant context", () => {
    const evidence = validatePvcu({ operation: "shift.create", tenantId: 1, userId: 9, role: "manager", payload: { startTime: "2026-01-01T09:00:00Z", endTime: "2026-01-01T17:00:00Z" } });
    expect(evidence.result).toBe("allowed");
    expect(evidence.layers).toContain("L4");
    expect(evidence.evidenceHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("denies cross-tenant or insufficient-role context", () => {
    const evidence = validatePvcu({ operation: "payroll.calculate", tenantId: 1, userId: 9, role: "employee", payload: { hoursWorked: 8 } });
    expect(evidence.result).toBe("human_review");
    expect(evidence.findings.join(" ")).toMatch(/requires role manager/);
  });

  it("uses all validation layers and fail-closed behavior for critical actions", () => {
    const profile = defaultProfile("critical");
    const evidence = validatePvcu({ profile, operation: "stripe.payment.create", tenantId: 1, userId: 9, role: "admin", payload: { amount: 100 } });
    expect(evidence.result).toBe("denied");
    expect(evidence.failureMode).toBe("fail_closed");
    expect(evidence.layers).toEqual(["L0", "L1", "L2", "L3", "L4", "L5", "L6", "L7", "L8"]);
  });

  it("detects malformed temporal and negative payroll payloads", () => {
    const evidence = validatePvcu({ operation: "shift.create", tenantId: 1, userId: 9, role: "manager", payload: { startTime: "2026-01-01T18:00:00Z", endTime: "2026-01-01T08:00:00Z", hourlyRate: -1 } });
    expect(evidence.result).toBe("denied");
    expect(evidence.findings).toEqual(expect.arrayContaining(["endTime must be after startTime", "hourlyRate cannot be negative"]));
  });

  it("verifies ordered evidence links", () => {
    expect(verifyEvidenceChain([{ evidenceHash: "a", previousEvidenceHash: null }, { evidenceHash: "b", previousEvidenceHash: "a" }])).toBe(true);
    expect(verifyEvidenceChain([{ evidenceHash: "a", previousEvidenceHash: null }, { evidenceHash: "b", previousEvidenceHash: "x" }])).toBe(false);
  });
});
