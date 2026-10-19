import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { planLimits } from '../drizzle/schema';
import { hasReachedEmployeeLimit, isPlanCapabilityEnabled, requirePlanCapability } from './plan-policy';

describe('AION Plan Enforcement Matrix & Procedures', () => {
  it('defines strict limits for Free, Pro and Enterprise plans', () => {
    expect(planLimits.free.employees).toBe(5);
    expect(planLimits.free.agreements).toBe(false);
    expect(planLimits.free.absences).toBe(false);
    expect(planLimits.free.auditExport).toBe(false);
    expect(planLimits.free.incidents).toBe(false);

    expect(planLimits.pro.employees).toBe(100);
    expect(planLimits.pro.agreements).toBe(true);
    expect(planLimits.pro.absences).toBe(true);
    expect(planLimits.pro.auditExport).toBe(true);
    expect(planLimits.pro.incidents).toBe(true);

    expect(planLimits.enterprise.employees).toBe(Number.MAX_SAFE_INTEGER);
    expect(planLimits.enterprise.agreements).toBe(true);
    expect(planLimits.enterprise.absences).toBe(true);
    expect(planLimits.enterprise.auditExport).toBe(true);
    expect(planLimits.enterprise.unlimitedHistory).toBe(true);
  });

  it('rejects restricted capabilities through the production plan policy', () => {
    expect(isPlanCapabilityEnabled('free', 'auditExport')).toBe(false);
    expect(isPlanCapabilityEnabled('pro', 'auditExport')).toBe(true);
    expect(() => requirePlanCapability('free', 'auditExport', 'CSV bloqueado')).toThrowError('CSV bloqueado');
    expect(() => requirePlanCapability('pro', 'auditExport', 'CSV bloqueado')).not.toThrow();
    expect(hasReachedEmployeeLimit('free', 5)).toBe(true);
    expect(hasReachedEmployeeLimit('free', 4)).toBe(false);
  });

  it('verifies procedural enforcement mapping for restricted capabilities', () => {
    const freePlanCheck = (count: number) => count >= planLimits.free.employees;
    expect(freePlanCheck(5)).toBe(true);
    expect(freePlanCheck(4)).toBe(false);

    const proExportAllowed = planLimits.pro.auditExport;
    const freeExportAllowed = planLimits.free.auditExport;
    expect(freeExportAllowed).toBe(false);
    expect(proExportAllowed).toBe(true);

    const freeAgreementAllowed = planLimits.free.agreements;
    const enterpriseAgreementAllowed = planLimits.enterprise.agreements;
    expect(freeAgreementAllowed).toBe(false);
    expect(enterpriseAgreementAllowed).toBe(true);
  });

  it('keeps payroll CSV behind both capability and manager authorization', () => {
    const source = readFileSync(new URL('./routers.ts', import.meta.url), 'utf8');
    const csvBlock = source.slice(source.indexOf('csv: protectedProcedure'), source.indexOf('}),\n  }),', source.indexOf('csv: protectedProcedure')));
    expect(csvBlock).toContain('requireRole(access, "manager")');
    expect(csvBlock).toContain('requirePlanCapability(access.tenant.plan, "auditExport"');
  });
});
