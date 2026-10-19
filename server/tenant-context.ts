import { and, desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  roleRank,
  tenantMembers,
  tenants,
  type TenantMemberRole,
  type User,
} from "../drizzle/schema";
import { getDb } from "./db";

export type TenantAccess = {
  tenant: typeof tenants.$inferSelect;
  membership: typeof tenantMembers.$inferSelect;
};

/** Resolve únicamente una membresía activa del usuario autenticado. */
export async function resolveTenantAccess(user: User, requestedTenantId?: number): Promise<TenantAccess> {
  const db = await getDb();
  if (!db) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
  }

  const predicates = [eq(tenantMembers.userId, user.id), eq(tenantMembers.status, "active")];
  if (requestedTenantId !== undefined) predicates.push(eq(tenantMembers.tenantId, requestedTenantId));

  const memberships = await db
    .select({ tenant: tenants, membership: tenantMembers })
    .from(tenantMembers)
    .innerJoin(tenants, eq(tenantMembers.tenantId, tenants.id))
    .where(and(...predicates))
    .orderBy(desc(tenantMembers.createdAt))
    .limit(1);

  if (!memberships[0]) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: requestedTenantId
        ? "No tienes acceso a este tenant"
        : "No tienes una membresía activa. Completa el onboarding o acepta una invitación.",
    });
  }

  return memberships[0];
}

export function requireRole(access: TenantAccess, minimumRole: TenantMemberRole): void {
  if (roleRank[access.membership.role] < roleRank[minimumRole]) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Esta operación requiere rol ${minimumRole} o superior`,
    });
  }
}

export function canManageEmployees(access: TenantAccess): boolean {
  return roleRank[access.membership.role] >= roleRank.manager;
}

export function canManageBilling(access: TenantAccess): boolean {
  return roleRank[access.membership.role] >= roleRank.admin;
}
