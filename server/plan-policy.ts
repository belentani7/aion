import { TRPCError } from "@trpc/server";
import { planLimits, type PlanType } from "../drizzle/schema";

export type PlanCapability = "auditExport" | "advancedCalendar" | "incidents" | "agreements" | "absences" | "unlimitedHistory";

export function isPlanCapabilityEnabled(plan: PlanType, capability: PlanCapability): boolean {
  return Boolean(planLimits[plan][capability]);
}

export function requirePlanCapability(plan: PlanType, capability: PlanCapability, message: string): void {
  if (!isPlanCapabilityEnabled(plan, capability)) {
    throw new TRPCError({ code: "FORBIDDEN", message });
  }
}

export function hasReachedEmployeeLimit(plan: PlanType, activeEmployeeCount: number): boolean {
  return activeEmployeeCount >= planLimits[plan].employees;
}
