import { describe, expect, it } from "vitest";
import { calculatePayrollBreakdown, normalizeAgreementRules } from "./payroll-policy";

describe("payroll policy engine", () => {
  it("normalizes invalid rules to bounded defaults", () => {
    const rules = normalizeAgreementRules({ overtimeMultiplier: -2, holidayWeekdays: [0, 7, 1, 1], fixedAllowance: "invalid" });
    expect(rules.overtimeMultiplier).toBe(1.5);
    expect(rules.holidayWeekdays).toEqual([0, 1]);
    expect(rules.fixedAllowance).toBe(0);
    expect(rules.version).toBe("default-1");
  });

  it("applies overtime and fixed allowance deterministically", () => {
    const result = calculatePayrollBreakdown({
      hourlyRate: 20,
      shifts: [{ startTime: new Date("2026-08-03T08:00:00"), endTime: new Date("2026-08-03T18:00:00") }],
      rules: { version: "agreement-v2", overtimeThresholdHours: 8, overtimeMultiplier: 1.5, fixedAllowance: 25 },
    });
    expect(result.totalHours).toBe(10);
    expect(result.regularHours).toBe(8);
    expect(result.overtimeHours).toBe(2);
    expect(result.baseAmount).toBe(160);
    expect(result.overtimePremium).toBe(20);
    expect(result.fixedAllowance).toBe(25);
    expect(result.totalAmount).toBe(205);
    expect(result.rulesVersion).toBe("agreement-v2");
  });

  it("tracks night and holiday hours without duplicating the base amount", () => {
    const result = calculatePayrollBreakdown({
      hourlyRate: 10,
      shifts: [{ startTime: new Date("2026-08-02T22:00:00"), endTime: new Date("2026-08-03T02:00:00") }],
      rules: { overtimeThresholdHours: 40, nightStartHour: 22, nightEndHour: 6, nightMultiplier: 1.25, holidayWeekdays: [0], holidayMultiplier: 2 },
    });
    expect(result.totalHours).toBe(4);
    expect(result.nightHours).toBe(4);
    expect(result.holidayHours).toBe(4);
    expect(result.baseAmount).toBe(40);
    expect(result.nightPremium).toBe(10);
    expect(result.holidayPremium).toBe(40);
    expect(result.totalAmount).toBe(90);
  });
});
