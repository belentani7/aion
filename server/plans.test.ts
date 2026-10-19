import { describe, expect, it } from "vitest";
import { planLimits } from "../drizzle/schema";

describe("AION plan enforcement matrix", () => {
  it("keeps employee limits ordered by plan", () => {
    expect(planLimits.free.employees).toBe(5);
    expect(planLimits.pro.employees).toBe(100);
    expect(planLimits.enterprise.employees).toBeGreaterThan(planLimits.pro.employees);
  });

  it("gates advanced calendar, incidents and CSV export at Pro", () => {
    expect(planLimits.free.advancedCalendar).toBe(false);
    expect(planLimits.free.incidents).toBe(false);
    expect(planLimits.free.auditExport).toBe(false);
    expect(planLimits.pro.advancedCalendar).toBe(true);
    expect(planLimits.pro.incidents).toBe(true);
    expect(planLimits.pro.auditExport).toBe(true);
  });
});
