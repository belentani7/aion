import { COOKIE_NAME } from "@shared/const";
import { aionRouter } from "./aion/router";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { getDb, insertAndFetch, updateAndFetch } from "./db";
import { autoSchedule } from "./scheduler";
import {
  auditEvents,
  departments,
  employees,
  incidents,
  payrollEntries,
  planLimits,
  shifts,
  tenantMembers,
  tenants,
  users,
  type TenantMemberRole,
} from "../drizzle/schema";
import { and, asc, count, desc, eq, gt, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import { collectiveAgreements, absences } from "../drizzle/schema";
import { LedgerService } from "./ledger.service";
import { resolveTenantAccess, requireRole } from "./tenant-context";
import { createPlanCheckoutSession, isStripeConfigured } from "./stripe.service";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { defaultProfile, validatePvcu, type MemberRole } from "./pvcu";
import { createValidationEnvelope, validateAgentAction, validateModelInteraction, validateModelLifecycle } from "./pvcu-ai";
import { createProvenanceRecord, fetchOpenMeteoWeather, openDataSources } from "./open-data";
import { logValidationOutcome } from "./observability";
import { hasReachedEmployeeLimit, requirePlanCapability } from "./plan-policy";
import { calculatePayrollBreakdown } from "./payroll-policy";

const tenantIdInput = z.object({ tenantId: z.number().int().positive().optional() }).optional();
const employeeRole = z.enum(["admin", "manager", "employee"]);
const memberRole = z.enum(["admin", "manager", "employee"]);

const DEFAULT_CHECKOUT_ORIGIN = "http://localhost:3000";

function resolveCheckoutOrigin(originHeader: unknown): string {
  const allowed = (process.env.CLIENT_ORIGIN ?? process.env.CLIENT_ORIGINS ?? "")
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean);
  if (typeof originHeader === "string" && allowed.includes(originHeader)) return originHeader;
  return allowed[0] ?? DEFAULT_CHECKOUT_ORIGIN;
}

function requireUser(ctx: { user: typeof users.$inferSelect | null }) {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: "Debes iniciar sesión" });
  return ctx.user;
}

function enforcePvcu(operation: string, access: { tenant: { id: number }; membership: { role: TenantMemberRole } }, user: typeof users.$inferSelect, payload?: unknown, idempotencyKey?: string) {
  const evidence = validatePvcu({ operation, tenantId: access.tenant.id, userId: user.id, role: access.membership.role as MemberRole, payload, idempotencyKey });
  logValidationOutcome(evidence);
  if (evidence.result !== "allowed") {
    throw new TRPCError({ code: evidence.result === "human_review" ? "FORBIDDEN" : "BAD_REQUEST", message: `PVC-U ${evidence.result}: ${evidence.findings.join("; ")}` });
  }
  return evidence;
}

async function requireEmployeeInTenant(db: any, tenantId: number, employeeId: number) {
  const [employee] = await db.select().from(employees).where(and(eq(employees.id, employeeId), eq(employees.tenantId, tenantId), eq(employees.active, 1))).limit(1);
  if (!employee) throw new TRPCError({ code: "BAD_REQUEST", message: "El empleado no pertenece al tenant activo o está inactivo" });
  return employee;
}

async function requireDepartmentInTenant(db: any, tenantId: number, departmentId: number) {
  const [department] = await db.select().from(departments).where(and(eq(departments.id, departmentId), eq(departments.tenantId, tenantId))).limit(1);
  if (!department) throw new TRPCError({ code: "BAD_REQUEST", message: "El departamento no pertenece al tenant activo" });
  return department;
}

function toCsv(rows: Array<Record<string, unknown>>): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  return [headers.join(","), ...rows.map((row) => headers.map((header) => escape(row[header])).join(","))].join("\n");
}

export const appRouter = router({
  system: systemRouter,
  aion: aionRouter,

  auth: router({
    me: publicProcedure.query(({ ctx }) => ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  tenant: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const user = requireUser(ctx);
      const access = await resolveTenantAccess(user);
      return access.tenant;
    }),

    list: protectedProcedure.query(async ({ ctx }) => {
      const user = requireUser(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      return db
        .select({ tenant: tenants, membership: tenantMembers })
        .from(tenantMembers)
        .innerJoin(tenants, eq(tenantMembers.tenantId, tenants.id))
        .where(and(eq(tenantMembers.userId, user.id), eq(tenantMembers.status, "active")))
        .orderBy(asc(tenants.name));
    }),

    current: protectedProcedure.input(tenantIdInput).query(async ({ ctx, input }) => {
      const user = requireUser(ctx);
      return resolveTenantAccess(user, input?.tenantId);
    }),

    create: protectedProcedure
      .input(z.object({ name: z.string().trim().min(2).max(255) }))
      .mutation(async ({ ctx, input }) => {
        const user = requireUser(ctx);
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

        const tenant = await insertAndFetch(db, tenants, tenants.id, { name: input.name, plan: "free" });
        await db.insert(tenantMembers).values({ tenantId: tenant.id, userId: user.id, role: "owner", status: "active" });
        await LedgerService.recordAuditEvent(tenant.id, "tenant_created", { createdByUserId: user.id, name: tenant.name });
        return tenant;
      }),

    updatePlan: protectedProcedure
      .input(z.object({ plan: z.enum(["free", "pro", "enterprise"]), tenantId: z.number().int().positive().optional() }))
      .mutation(async ({ ctx, input }) => {
        const user = requireUser(ctx);
        const access = await resolveTenantAccess(user, input.tenantId);
        requireRole(access, "admin");
        enforcePvcu("plan.update", access, user, { plan: input.plan });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const updated = await updateAndFetch(db, tenants, eq(tenants.id, access.tenant.id), { plan: input.plan, updatedAt: new Date() });
        await LedgerService.recordAuditEvent(access.tenant.id, "plan_updated", { newPlan: input.plan, changedByUserId: user.id });
        return updated;
      }),

    members: router({
      list: protectedProcedure.input(tenantIdInput).query(async ({ ctx, input }) => {
        const user = requireUser(ctx);
        const access = await resolveTenantAccess(user, input?.tenantId);
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        return db
          .select({ membership: tenantMembers, user: users })
          .from(tenantMembers)
          .innerJoin(users, eq(tenantMembers.userId, users.id))
          .where(and(eq(tenantMembers.tenantId, access.tenant.id), eq(tenantMembers.status, "active")))
          .orderBy(asc(users.name));
      }),

      add: protectedProcedure
        .input(z.object({ tenantId: z.number().int().positive().optional(), userId: z.number().int().positive(), role: memberRole }))
        .mutation(async ({ ctx, input }) => {
          const user = requireUser(ctx);
          const access = await resolveTenantAccess(user, input.tenantId);
          requireRole(access, "admin");
          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
          await db
            .insert(tenantMembers)
            .values({ tenantId: access.tenant.id, userId: input.userId, role: input.role, status: "active" })
            .onDuplicateKeyUpdate({ set: { role: input.role, status: "active", updatedAt: new Date() } });
          const [membership] = await db.select().from(tenantMembers).where(and(eq(tenantMembers.tenantId, access.tenant.id), eq(tenantMembers.userId, input.userId))).limit(1);
          await LedgerService.recordAuditEvent(access.tenant.id, "member_added", { memberUserId: input.userId, role: input.role, changedByUserId: user.id });
          return membership;
        }),

      updateRole: protectedProcedure
        .input(z.object({ tenantId: z.number().int().positive().optional(), memberUserId: z.number().int().positive(), role: memberRole }))
        .mutation(async ({ ctx, input }) => {
          const user = requireUser(ctx);
          const access = await resolveTenantAccess(user, input.tenantId);
          requireRole(access, "admin");
          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
          const membership = await updateAndFetch(db, tenantMembers, and(eq(tenantMembers.tenantId, access.tenant.id), eq(tenantMembers.userId, input.memberUserId)), { role: input.role, updatedAt: new Date() });
          if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "Membresía no encontrada" });
          await LedgerService.recordAuditEvent(access.tenant.id, "member_role_updated", { memberUserId: input.memberUserId, role: input.role, changedByUserId: user.id });
          return membership;
        }),
    }),
  }),

  dashboard: router({
    stats: protectedProcedure.input(tenantIdInput).query(async ({ ctx, input }) => {
      const user = requireUser(ctx);
      const access = await resolveTenantAccess(user, input?.tenantId);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const tenantId = access.tenant.id;
      const [employeesCount] = await db.select({ value: count() }).from(employees).where(and(eq(employees.tenantId, tenantId), eq(employees.active, 1)));
      const [shiftsCount] = await db.select({ value: count() }).from(shifts).where(eq(shifts.tenantId, tenantId));
      const [payrollTotal] = await db.select({ value: sql<string>`COALESCE(SUM(${payrollEntries.totalAmount}), 0)` }).from(payrollEntries).where(eq(payrollEntries.tenantId, tenantId));
      const [hoursTotal] = await db.select({ value: sql<string>`COALESCE(SUM(TIMESTAMPDIFF(SECOND, ${shifts.startTime}, ${shifts.endTime})) / 3600, 0)` }).from(shifts).where(and(eq(shifts.tenantId, tenantId), inArray(shifts.status, ["completed", "scheduled"])));
      const [uncovered] = await db.select({ value: count() }).from(shifts).where(and(eq(shifts.tenantId, tenantId), isNull(shifts.employeeId)));
      const [openIncidents] = await db.select({ value: count() }).from(incidents).where(and(eq(incidents.tenantId, tenantId), inArray(incidents.status, ["open", "investigating"])));
      return {
        totalEmployees: employeesCount?.value ?? 0,
        totalShifts: shiftsCount?.value ?? 0,
        totalHours: Number(hoursTotal?.value ?? 0),
        payrollCost: payrollTotal?.value ?? "0.00",
        uncoveredShifts: uncovered?.value ?? 0,
        openIncidents: openIncidents?.value ?? 0,
      };
    }),
  }),

  departments: router({
    list: protectedProcedure.input(tenantIdInput).query(async ({ ctx, input }) => {
      const user = requireUser(ctx);
      const access = await resolveTenantAccess(user, input?.tenantId);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      return db.select().from(departments).where(eq(departments.tenantId, access.tenant.id)).orderBy(asc(departments.name));
    }),
    create: protectedProcedure
      .input(z.object({ tenantId: z.number().int().positive().optional(), name: z.string().trim().min(2).max(120) }))
      .mutation(async ({ ctx, input }) => {
        const user = requireUser(ctx);
        const access = await resolveTenantAccess(user, input.tenantId);
        requireRole(access, "manager");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const department = await insertAndFetch(db, departments, departments.id, { tenantId: access.tenant.id, name: input.name });
        return department;
      }),
  }),

  employees: router({
    list: protectedProcedure.input(z.object({ tenantId: z.number().int().positive().optional(), departmentId: z.number().int().positive().optional(), activeOnly: z.boolean().default(true) }).optional()).query(async ({ ctx, input = {} }) => {
      const user = requireUser(ctx);
      const access = await resolveTenantAccess(user, input.tenantId);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const filters = [eq(employees.tenantId, access.tenant.id)];
      if (input.departmentId) filters.push(eq(employees.departmentId, input.departmentId));
      if (input.activeOnly) filters.push(eq(employees.active, 1));
      return db.select().from(employees).where(and(...filters)).orderBy(asc(employees.name));
    }),

    listPage: protectedProcedure
      .input(z.object({
        tenantId: z.number().int().positive().optional(),
        departmentId: z.number().int().positive().optional(),
        activeOnly: z.boolean().default(true),
        cursor: z.number().int().positive().optional(),
        pageSize: z.number().int().min(1).max(100).default(25),
      }))
      .query(async ({ ctx, input }) => {
        const user = requireUser(ctx);
        const access = await resolveTenantAccess(user, input.tenantId);
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const filters = [eq(employees.tenantId, access.tenant.id)];
        if (input.departmentId) filters.push(eq(employees.departmentId, input.departmentId));
        if (input.activeOnly) filters.push(eq(employees.active, 1));
        if (input.cursor) filters.push(gt(employees.id, input.cursor));
        const rows = await db.select().from(employees).where(and(...filters)).orderBy(asc(employees.id)).limit(input.pageSize + 1);
        const hasNextPage = rows.length > input.pageSize;
        const items = hasNextPage ? rows.slice(0, input.pageSize) : rows;
        return { items, nextCursor: hasNextPage ? items[items.length - 1]?.id ?? null : null, hasNextPage };
      }),

    get: protectedProcedure.input(z.object({ tenantId: z.number().int().positive().optional(), employeeId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const user = requireUser(ctx);
      const access = await resolveTenantAccess(user, input.tenantId);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const [employee] = await db.select().from(employees).where(and(eq(employees.id, input.employeeId), eq(employees.tenantId, access.tenant.id)));
      if (!employee) throw new TRPCError({ code: "NOT_FOUND", message: "Empleado no encontrado" });
      const employeeShifts = await db.select().from(shifts).where(and(eq(shifts.tenantId, access.tenant.id), eq(shifts.employeeId, employee.id))).orderBy(desc(shifts.startTime));
      const payroll = await db.select().from(payrollEntries).where(and(eq(payrollEntries.tenantId, access.tenant.id), eq(payrollEntries.employeeId, employee.id))).orderBy(desc(payrollEntries.periodEnd));
      const employeeIncidents = await db.select().from(incidents).where(and(eq(incidents.tenantId, access.tenant.id), eq(incidents.employeeId, employee.id))).orderBy(desc(incidents.createdAt));
      return { employee, shifts: employeeShifts, payroll, incidents: employeeIncidents };
    }),

    historyPage: protectedProcedure
      .input(z.object({
        tenantId: z.number().int().positive().optional(),
        employeeId: z.number().int().positive(),
        resource: z.enum(["shifts", "payroll", "incidents"]),
        cursor: z.number().int().positive().optional(),
        pageSize: z.number().int().min(1).max(100).default(25),
      }))
      .query(async ({ ctx, input }) => {
        const user = requireUser(ctx);
        const access = await resolveTenantAccess(user, input.tenantId);
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const [employee] = await db.select({ id: employees.id }).from(employees).where(and(eq(employees.id, input.employeeId), eq(employees.tenantId, access.tenant.id))).limit(1);
        if (!employee) throw new TRPCError({ code: "NOT_FOUND", message: "Empleado no encontrado" });
        const pageSize = input.pageSize;
        const cursorFilter = (column: typeof shifts.id | typeof payrollEntries.id | typeof incidents.id) => input.cursor ? gt(column, input.cursor) : undefined;
        if (input.resource === "shifts") {
          const filters = [eq(shifts.tenantId, access.tenant.id), eq(shifts.employeeId, input.employeeId)];
          const cursor = cursorFilter(shifts.id); if (cursor) filters.push(cursor);
          const rows = await db.select().from(shifts).where(and(...filters)).orderBy(asc(shifts.id)).limit(pageSize + 1);
          const hasNextPage = rows.length > pageSize; const items = hasNextPage ? rows.slice(0, pageSize) : rows;
          return { resource: input.resource, items, nextCursor: hasNextPage ? items[items.length - 1]?.id ?? null : null, hasNextPage };
        }
        if (input.resource === "payroll") {
          const filters = [eq(payrollEntries.tenantId, access.tenant.id), eq(payrollEntries.employeeId, input.employeeId)];
          const cursor = cursorFilter(payrollEntries.id); if (cursor) filters.push(cursor);
          const rows = await db.select().from(payrollEntries).where(and(...filters)).orderBy(asc(payrollEntries.id)).limit(pageSize + 1);
          const hasNextPage = rows.length > pageSize; const items = hasNextPage ? rows.slice(0, pageSize) : rows;
          return { resource: input.resource, items, nextCursor: hasNextPage ? items[items.length - 1]?.id ?? null : null, hasNextPage };
        }
        const filters = [eq(incidents.tenantId, access.tenant.id), eq(incidents.employeeId, input.employeeId)];
        const cursor = cursorFilter(incidents.id); if (cursor) filters.push(cursor);
        const rows = await db.select().from(incidents).where(and(...filters)).orderBy(asc(incidents.id)).limit(pageSize + 1);
        const hasNextPage = rows.length > pageSize; const items = hasNextPage ? rows.slice(0, pageSize) : rows;
        return { resource: input.resource, items, nextCursor: hasNextPage ? items[items.length - 1]?.id ?? null : null, hasNextPage };
      }),

    create: protectedProcedure
      .input(z.object({ tenantId: z.number().int().positive().optional(), departmentId: z.number().int().positive().nullable().optional(), name: z.string().trim().min(2).max(255), role: employeeRole, hourlyRate: z.coerce.number().min(0).max(100000) }))
      .mutation(async ({ ctx, input }) => {
        const user = requireUser(ctx);
        const access = await resolveTenantAccess(user, input.tenantId);
        requireRole(access, "manager");
        enforcePvcu("employee.create", access, user, { departmentId: input.departmentId, role: input.role, hourlyRate: input.hourlyRate });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const [existing] = await db.select({ value: count() }).from(employees).where(and(eq(employees.tenantId, access.tenant.id), eq(employees.active, 1)));
        if (input.departmentId) await requireDepartmentInTenant(db, access.tenant.id, input.departmentId);
        const limit = planLimits[access.tenant.plan].employees;
        if (hasReachedEmployeeLimit(access.tenant.plan, Number(existing?.value ?? 0))) throw new TRPCError({ code: "FORBIDDEN", message: `El plan ${access.tenant.plan} permite ${limit} empleados` });
        const employee = await insertAndFetch(db, employees, employees.id, { tenantId: access.tenant.id, departmentId: input.departmentId ?? null, name: input.name, role: input.role, hourlyRate: input.hourlyRate.toFixed(2), active: 1 });
        await LedgerService.recordAuditEvent(access.tenant.id, "employee_created", { employeeId: employee.id, name: employee.name, role: employee.role, createdByUserId: user.id });
        return employee;
      }),

    update: protectedProcedure
      .input(z.object({ tenantId: z.number().int().positive().optional(), employeeId: z.number().int().positive(), departmentId: z.number().int().positive().nullable().optional(), name: z.string().trim().min(2).max(255).optional(), role: employeeRole.optional(), hourlyRate: z.coerce.number().min(0).max(100000).optional(), active: z.boolean().optional() }))
      .mutation(async ({ ctx, input }) => {
        const user = requireUser(ctx);
        const access = await resolveTenantAccess(user, input.tenantId);
        requireRole(access, "manager");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        if (input.departmentId) await requireDepartmentInTenant(db, access.tenant.id, input.departmentId);
        const employee = await updateAndFetch(db, employees, and(eq(employees.id, input.employeeId), eq(employees.tenantId, access.tenant.id)), { ...(input.name ? { name: input.name } : {}), ...(input.role ? { role: input.role } : {}), ...(input.hourlyRate !== undefined ? { hourlyRate: input.hourlyRate.toFixed(2) } : {}), ...(input.departmentId !== undefined ? { departmentId: input.departmentId } : {}), ...(input.active !== undefined ? { active: input.active ? 1 : 0 } : {}), updatedAt: new Date() });
        if (!employee) throw new TRPCError({ code: "NOT_FOUND", message: "Empleado no encontrado" });
        await LedgerService.recordAuditEvent(access.tenant.id, "employee_updated", { employeeId: employee.id, updatedByUserId: user.id });
        return employee;
      }),

    delete: protectedProcedure
      .input(z.object({ tenantId: z.number().int().positive().optional(), employeeId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const user = requireUser(ctx);
        const access = await resolveTenantAccess(user, input.tenantId);
        requireRole(access, "admin");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const employee = await updateAndFetch(db, employees, and(eq(employees.id, input.employeeId), eq(employees.tenantId, access.tenant.id)), { active: 0, updatedAt: new Date() });
        if (!employee) throw new TRPCError({ code: "NOT_FOUND", message: "Empleado no encontrado" });
        await LedgerService.recordAuditEvent(access.tenant.id, "employee_deleted", { employeeId: employee.id, deletedByUserId: user.id });
        return { success: true };
      }),
  }),

  shifts: router({
    list: protectedProcedure.input(z.object({ tenantId: z.number().int().positive().optional(), from: z.coerce.date().optional(), to: z.coerce.date().optional(), employeeId: z.number().int().positive().optional(), departmentId: z.number().int().positive().optional(), status: z.enum(["scheduled", "completed", "cancelled", "pending_approval"]).optional() }).optional()).query(async ({ ctx, input = {} }) => {
      const user = requireUser(ctx);
      const access = await resolveTenantAccess(user, input.tenantId);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      if (input.from && input.to) {
        const rangeDays = (input.to.getTime() - input.from.getTime()) / 86_400_000;
        if (rangeDays > 8) requirePlanCapability(access.tenant.plan, "advancedCalendar", "El calendario mensual requiere plan Pro o Enterprise");
      }
      const filters = [eq(shifts.tenantId, access.tenant.id)];
      if (input.from) filters.push(gte(shifts.startTime, input.from));
      if (input.to) filters.push(lte(shifts.endTime, input.to));
      if (input.employeeId) filters.push(eq(shifts.employeeId, input.employeeId));
      if (input.departmentId) filters.push(eq(shifts.departmentId, input.departmentId));
      if (input.status) filters.push(eq(shifts.status, input.status));
      return db.select({ id: shifts.id, tenantId: shifts.tenantId, employeeId: shifts.employeeId, employeeName: employees.name, startTime: shifts.startTime, endTime: shifts.endTime, status: shifts.status, createdAt: shifts.createdAt }).from(shifts).leftJoin(employees, and(eq(shifts.employeeId, employees.id), eq(shifts.tenantId, employees.tenantId))).where(and(...filters)).orderBy(asc(shifts.startTime));
    }),

    create: protectedProcedure
      .input(z.object({ tenantId: z.number().int().positive().optional(), employeeId: z.number().int().positive().nullable().optional(), departmentId: z.number().int().positive().nullable().optional(), startTime: z.coerce.date(), endTime: z.coerce.date(), status: z.enum(["scheduled", "completed", "cancelled", "pending_approval"]).default("scheduled"), notes: z.string().max(2000).optional() }))
      .mutation(async ({ ctx, input }) => {
        const user = requireUser(ctx);
        const access = await resolveTenantAccess(user, input.tenantId);
        requireRole(access, "manager");
        enforcePvcu("shift.create", access, user, { employeeId: input.employeeId, departmentId: input.departmentId, startTime: input.startTime, endTime: input.endTime });
        if (input.endTime <= input.startTime) throw new TRPCError({ code: "BAD_REQUEST", message: "El final debe ser posterior al inicio" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        if (input.employeeId) await requireEmployeeInTenant(db, access.tenant.id, input.employeeId);
        if (input.departmentId) await requireDepartmentInTenant(db, access.tenant.id, input.departmentId);
        const shift = await insertAndFetch(db, shifts, shifts.id, { tenantId: access.tenant.id, employeeId: input.employeeId ?? null, departmentId: input.departmentId ?? null, startTime: input.startTime, endTime: input.endTime, status: input.status, notes: input.notes ?? null });
        await LedgerService.recordAuditEvent(access.tenant.id, "shift_created", { shiftId: shift.id, employeeId: shift.employeeId, startTime: shift.startTime.toISOString(), endTime: shift.endTime.toISOString(), createdByUserId: user.id });
        return shift;
      }),

    update: protectedProcedure
      .input(z.object({ tenantId: z.number().int().positive().optional(), shiftId: z.number().int().positive(), employeeId: z.number().int().positive().nullable().optional(), departmentId: z.number().int().positive().nullable().optional(), startTime: z.coerce.date().optional(), endTime: z.coerce.date().optional(), status: z.enum(["scheduled", "completed", "cancelled", "pending_approval"]).optional(), notes: z.string().max(2000).nullable().optional() }))
      .mutation(async ({ ctx, input }) => {
        const user = requireUser(ctx);
        const access = await resolveTenantAccess(user, input.tenantId);
        requireRole(access, "manager");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const [existing] = await db.select().from(shifts).where(and(eq(shifts.id, input.shiftId), eq(shifts.tenantId, access.tenant.id)));
        if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Turno no encontrado" });
        if (input.employeeId) await requireEmployeeInTenant(db, access.tenant.id, input.employeeId);
        if (input.departmentId) await requireDepartmentInTenant(db, access.tenant.id, input.departmentId);
        const nextStart = input.startTime ?? existing.startTime;
        const nextEnd = input.endTime ?? existing.endTime;
        if (nextEnd <= nextStart) throw new TRPCError({ code: "BAD_REQUEST", message: "El final debe ser posterior al inicio" });
        const shift = await updateAndFetch(db, shifts, and(eq(shifts.id, input.shiftId), eq(shifts.tenantId, access.tenant.id)), { ...(input.employeeId !== undefined ? { employeeId: input.employeeId } : {}), ...(input.departmentId !== undefined ? { departmentId: input.departmentId } : {}), ...(input.startTime ? { startTime: input.startTime } : {}), ...(input.endTime ? { endTime: input.endTime } : {}), ...(input.status ? { status: input.status } : {}), ...(input.notes !== undefined ? { notes: input.notes } : {}), updatedAt: new Date() });
        await LedgerService.recordAuditEvent(access.tenant.id, "shift_updated", { shiftId: shift.id, updatedByUserId: user.id });
        return shift;
      }),

    delete: protectedProcedure
      .input(z.object({ tenantId: z.number().int().positive().optional(), shiftId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const user = requireUser(ctx);
        const access = await resolveTenantAccess(user, input.tenantId);
        requireRole(access, "manager");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const shift = await updateAndFetch(db, shifts, and(eq(shifts.id, input.shiftId), eq(shifts.tenantId, access.tenant.id)), { status: "cancelled", updatedAt: new Date() });
        if (!shift) throw new TRPCError({ code: "NOT_FOUND", message: "Turno no encontrado" });
        await LedgerService.recordAuditEvent(access.tenant.id, "shift_deleted", { shiftId: shift.id, deletedByUserId: user.id });
        return { success: true };
      }),
  }),

  payroll: router({
    list: protectedProcedure.input(z.object({ tenantId: z.number().int().positive().optional(), periodStart: z.coerce.date().optional(), periodEnd: z.coerce.date().optional(), employeeId: z.number().int().positive().optional() }).optional()).query(async ({ ctx, input = {} }) => {
      const user = requireUser(ctx);
      const access = await resolveTenantAccess(user, input.tenantId);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const filters = [eq(payrollEntries.tenantId, access.tenant.id)];
      if (input.periodStart) filters.push(gte(payrollEntries.periodStart, input.periodStart));
      if (input.periodEnd) filters.push(lte(payrollEntries.periodEnd, input.periodEnd));
      if (input.employeeId) filters.push(eq(payrollEntries.employeeId, input.employeeId));
      return db.select({ id: payrollEntries.id, tenantId: payrollEntries.tenantId, employeeId: payrollEntries.employeeId, employeeName: employees.name, totalAmount: payrollEntries.totalAmount, hoursWorked: payrollEntries.hoursWorked, hash: payrollEntries.hash, payrollDate: payrollEntries.payrollDate, periodStart: payrollEntries.periodStart, periodEnd: payrollEntries.periodEnd }).from(payrollEntries).innerJoin(employees, and(eq(payrollEntries.employeeId, employees.id), eq(payrollEntries.tenantId, employees.tenantId))).where(and(...filters)).orderBy(desc(payrollEntries.periodEnd));
    }),

    calculate: protectedProcedure
      .input(z.object({ tenantId: z.number().int().positive().optional(), employeeId: z.number().int().positive(), hours: z.number().positive().optional() }))
      .mutation(async ({ ctx, input }) => {
        const periodEnd = new Date();
        const periodStart = new Date(periodEnd);
        periodStart.setDate(periodStart.getDate() - 14);
        const user = requireUser(ctx);
        const access = await resolveTenantAccess(user, input.tenantId);
        requireRole(access, "manager");
        enforcePvcu("payroll.calculate", access, user, { employeeId: input.employeeId, hours: input.hours });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const [employee] = await db.select().from(employees).where(and(eq(employees.id, input.employeeId), eq(employees.tenantId, access.tenant.id), eq(employees.active, 1)));
        if (!employee) throw new TRPCError({ code: "NOT_FOUND", message: "Empleado no encontrado" });
        const [derivedHours] = await db.select({ value: sql<string>`COALESCE(SUM(TIMESTAMPDIFF(SECOND, ${shifts.startTime}, ${shifts.endTime})) / 3600, 0)` }).from(shifts).where(and(eq(shifts.tenantId, access.tenant.id), eq(shifts.employeeId, employee.id), eq(shifts.status, "completed"), gte(shifts.startTime, periodStart), lte(shifts.endTime, periodEnd)));
        const calculatedHours = Number(derivedHours?.value ?? 0);
        const hoursWorked = input.hours ?? calculatedHours;
        return LedgerService.createPayrollEntry({ tenantId: access.tenant.id, employeeId: employee.id, periodStart, periodEnd, hoursWorked: hoursWorked.toFixed(2), totalAmount: (hoursWorked * Number(employee.hourlyRate)).toFixed(2) });
      }),

    calculatePeriod: protectedProcedure
      .input(z.object({ tenantId: z.number().int().positive().optional(), employeeId: z.number().int().positive(), periodStart: z.coerce.date(), periodEnd: z.coerce.date() }))
      .mutation(async ({ ctx, input }) => {
        const user = requireUser(ctx);
        const access = await resolveTenantAccess(user, input.tenantId);
        requireRole(access, "manager");
        enforcePvcu("payroll.calculate.period", access, user, { employeeId: input.employeeId, periodStart: input.periodStart, periodEnd: input.periodEnd });
        if (input.periodEnd <= input.periodStart) throw new TRPCError({ code: "BAD_REQUEST", message: "Período inválido" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const [employee] = await db.select().from(employees).where(and(eq(employees.id, input.employeeId), eq(employees.tenantId, access.tenant.id), eq(employees.active, 1)));
        if (!employee) throw new TRPCError({ code: "NOT_FOUND", message: "Empleado no encontrado" });
        const shiftRows = await db.select({ startTime: shifts.startTime, endTime: shifts.endTime }).from(shifts).where(and(eq(shifts.tenantId, access.tenant.id), eq(shifts.employeeId, employee.id), eq(shifts.status, "completed"), gte(shifts.startTime, input.periodStart), lte(shifts.endTime, input.periodEnd))).orderBy(asc(shifts.startTime));
        const [agreement] = await db.select({ rules: collectiveAgreements.rules, code: collectiveAgreements.code }).from(collectiveAgreements).where(and(eq(collectiveAgreements.tenantId, access.tenant.id), eq(collectiveAgreements.active, 1))).orderBy(desc(collectiveAgreements.createdAt)).limit(1);
        const breakdown = calculatePayrollBreakdown({ hourlyRate: Number(employee.hourlyRate), shifts: shiftRows, rules: agreement?.rules });
        return LedgerService.createPayrollEntry({ tenantId: access.tenant.id, employeeId: employee.id, periodStart: input.periodStart, periodEnd: input.periodEnd, hoursWorked: breakdown.totalHours.toFixed(2), totalAmount: breakdown.totalAmount.toFixed(2), breakdown: { ...breakdown, agreementCode: agreement?.code ?? null } });
      }),

    csv: protectedProcedure.input(z.object({ tenantId: z.number().int().positive().optional(), periodStart: z.coerce.date().optional(), periodEnd: z.coerce.date().optional() })).query(async ({ ctx, input }) => {
      const user = requireUser(ctx);
      const access = await resolveTenantAccess(user, input.tenantId);
      requireRole(access, "manager");
      requirePlanCapability(access.tenant.plan, "auditExport", "La exportación está disponible desde el plan Pro");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const filters = [eq(payrollEntries.tenantId, access.tenant.id)];
      if (input.periodStart) filters.push(gte(payrollEntries.periodStart, input.periodStart));
      if (input.periodEnd) filters.push(lte(payrollEntries.periodEnd, input.periodEnd));
      const rows = await db.select({ employee: employees.name, periodStart: payrollEntries.periodStart, periodEnd: payrollEntries.periodEnd, hoursWorked: payrollEntries.hoursWorked, totalAmount: payrollEntries.totalAmount, hash: payrollEntries.hash }).from(payrollEntries).innerJoin(employees, and(eq(payrollEntries.employeeId, employees.id), eq(payrollEntries.tenantId, employees.tenantId))).where(and(...filters)).orderBy(desc(payrollEntries.periodEnd));
      return { filename: `aion-payroll-${access.tenant.id}.csv`, csv: toCsv(rows) };
    }),
  }),

  incidents: router({
    list: protectedProcedure.input(z.object({ tenantId: z.number().int().positive().optional(), employeeId: z.number().int().positive().optional() })).query(async ({ ctx, input }) => {
      const user = requireUser(ctx);
      const access = await resolveTenantAccess(user, input.tenantId);
      requirePlanCapability(access.tenant.plan, "incidents", "Las incidencias requieren plan Pro o Enterprise");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const filters = [eq(incidents.tenantId, access.tenant.id)];
      if (input.employeeId) filters.push(eq(incidents.employeeId, input.employeeId));
      return db.select({ incident: incidents, employee: employees }).from(incidents).innerJoin(employees, and(eq(incidents.employeeId, employees.id), eq(incidents.tenantId, employees.tenantId))).where(and(...filters)).orderBy(desc(incidents.createdAt));
    }),
    create: protectedProcedure.input(z.object({ tenantId: z.number().int().positive().optional(), employeeId: z.number().int().positive(), title: z.string().trim().min(2).max(180), description: z.string().trim().min(2).max(5000), severity: z.enum(["low", "medium", "high", "critical"]).default("medium") })).mutation(async ({ ctx, input }) => {
      const user = requireUser(ctx);
      const access = await resolveTenantAccess(user, input.tenantId);
      requireRole(access, "manager");
      requirePlanCapability(access.tenant.plan, "incidents", "Las incidencias requieren plan Pro o Enterprise");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      await requireEmployeeInTenant(db, access.tenant.id, input.employeeId);
      const incident = await insertAndFetch(db, incidents, incidents.id, { tenantId: access.tenant.id, employeeId: input.employeeId, title: input.title, description: input.description, severity: input.severity, status: "open" });
      await LedgerService.recordAuditEvent(access.tenant.id, "incident_created", { incidentId: incident.id, employeeId: input.employeeId, createdByUserId: user.id });
      return incident;
    }),
    update: protectedProcedure.input(z.object({ tenantId: z.number().int().positive().optional(), incidentId: z.number().int().positive(), status: z.enum(["open", "investigating", "resolved"]).optional(), severity: z.enum(["low", "medium", "high", "critical"]).optional(), description: z.string().trim().min(2).max(5000).optional() })).mutation(async ({ ctx, input }) => {
      const user = requireUser(ctx);
      const access = await resolveTenantAccess(user, input.tenantId);
      requireRole(access, "manager");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const incident = await updateAndFetch(db, incidents, and(eq(incidents.id, input.incidentId), eq(incidents.tenantId, access.tenant.id)), { ...(input.status ? { status: input.status } : {}), ...(input.severity ? { severity: input.severity } : {}), ...(input.description ? { description: input.description } : {}), updatedAt: new Date() });
      if (!incident) throw new TRPCError({ code: "NOT_FOUND", message: "Incidencia no encontrada" });
      await LedgerService.recordAuditEvent(access.tenant.id, "incident_updated", { incidentId: incident.id, updatedByUserId: user.id });
      return incident;
    }),
  }),

  billing: router({
    createCheckoutSession: protectedProcedure
      .input(z.object({ tenantId: z.number().int().positive().optional(), plan: z.enum(["pro", "enterprise"]), idempotencyKey: z.string().trim().min(16).max(200).optional() }))
      .mutation(async ({ ctx, input }) => {
        const user = requireUser(ctx);
        if (!isStripeConfigured()) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Stripe no está configurado" });
        const access = await resolveTenantAccess(user, input.tenantId);
        requireRole(access, "admin");
        const idempotencyKey = input.idempotencyKey ?? (typeof ctx.req.headers["x-idempotency-key"] === "string" ? ctx.req.headers["x-idempotency-key"] : undefined);
        if (!idempotencyKey) throw new TRPCError({ code: "BAD_REQUEST", message: "Stripe checkout requiere idempotencyKey" });
        enforcePvcu("stripe.checkout.create", access, user, { plan: input.plan }, idempotencyKey);
        const origin = resolveCheckoutOrigin(ctx.req.headers.origin);
        const session = await createPlanCheckoutSession({ tenantId: access.tenant.id, userId: user.id, email: user.email, name: access.tenant.name, plan: input.plan, origin, idempotencyKey });
        if (!session.url) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Stripe no devolvió una URL de checkout" });
        return { url: session.url, sessionId: session.id };
      }),
  }),

  validation: router({
    profiles: protectedProcedure.query(() => (["low", "medium", "high", "critical"] as const).map(defaultProfile)),
    inspect: protectedProcedure.input(z.object({ tenantId: z.number().int().positive().optional(), operation: z.string().trim().min(2).max(120), payload: z.unknown().optional(), idempotencyKey: z.string().trim().min(16).max(200).optional() })).query(async ({ ctx, input }) => {
      const user = requireUser(ctx);
      const access = await resolveTenantAccess(user, input.tenantId);
      const evidence = validatePvcu({ operation: input.operation, tenantId: access.tenant.id, userId: user.id, role: access.membership.role as MemberRole, payload: input.payload, idempotencyKey: input.idempotencyKey });
      logValidationOutcome(evidence);
      return evidence;
    }),
    aiInteraction: protectedProcedure.input(z.object({ tenantId: z.number().int().positive().optional(), prompt: z.string().max(16000), response: z.unknown(), modelId: z.string().max(160).optional(), modelVersion: z.string().max(80).optional(), expectedJson: z.boolean().default(false) })).mutation(async ({ ctx, input }) => {
      const user = requireUser(ctx);
      const access = await resolveTenantAccess(user, input.tenantId);
      requireRole(access, "manager");
      return createValidationEnvelope(validateModelInteraction(input), `tenant/${access.tenant.id}/ai/${input.modelId ?? "unknown"}`);
    }),
    modelLifecycle: protectedProcedure.input(z.object({ tenantId: z.number().int().positive().optional(), modelId: z.string().min(1).max(160), modelVersion: z.string().min(1).max(80), approvedModelVersion: z.string().min(1).max(80), baselineMetric: z.number().min(0).max(1), productionMetric: z.number().min(0).max(1), driftThreshold: z.number().min(0).max(1).optional() })).mutation(async ({ ctx, input }) => {
      const user = requireUser(ctx);
      const access = await resolveTenantAccess(user, input.tenantId);
      requireRole(access, "admin");
      return createValidationEnvelope(validateModelLifecycle(input), `tenant/${access.tenant.id}/model/${input.modelId}`);
    }),
    agentAction: protectedProcedure.input(z.object({ tenantId: z.number().int().positive().optional(), intent: z.string().min(2).max(1000), action: z.string().min(2).max(160), role: z.enum(["owner", "admin", "manager", "employee"]), allowedActions: z.array(z.string().min(1).max(160)).max(100), estimatedCost: z.number().nonnegative(), budget: z.number().nonnegative(), reversible: z.boolean(), requiresHumanApproval: z.boolean().optional() })).mutation(async ({ ctx, input }) => {
      const user = requireUser(ctx);
      const access = await resolveTenantAccess(user, input.tenantId);
      requireRole(access, "manager");
      if (input.role !== access.membership.role && access.membership.role !== "owner" && access.membership.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "El rol agéntico no coincide con la membresía activa" });
      return createValidationEnvelope(validateAgentAction(input), `tenant/${access.tenant.id}/agent/${user.id}`);
    }),
    openDataSources: protectedProcedure.query(() => openDataSources),
    weather: protectedProcedure.input(z.object({ tenantId: z.number().int().positive().optional(), location: z.string().trim().min(2).max(120), latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) })).query(async ({ ctx, input }) => {
      const user = requireUser(ctx);
      const access = await resolveTenantAccess(user, input.tenantId);
      const snapshot = await fetchOpenMeteoWeather({ location: input.location, latitude: input.latitude, longitude: input.longitude });
      return { tenantId: access.tenant.id, snapshot };
    }),
    provenance: protectedProcedure.input(z.object({ tenantId: z.number().int().positive().optional(), sourceId: z.string().min(1).max(80), response: z.unknown(), schemaVersion: z.string().min(1).max(80), cacheKey: z.string().min(1).max(255) })).mutation(async ({ ctx, input }) => {
      const user = requireUser(ctx);
      const access = await resolveTenantAccess(user, input.tenantId);
      requireRole(access, "manager");
      return { tenantId: access.tenant.id, createdByUserId: user.id, provenance: createProvenanceRecord(input) };
    }),
  }),

  agreements: router({
    list: protectedProcedure.input(tenantIdInput).query(async ({ ctx, input }) => {
      const user = requireUser(ctx);
      const access = await resolveTenantAccess(user, input?.tenantId);
      requirePlanCapability(access.tenant.plan, "agreements", "Los convenios requieren plan Pro o Enterprise");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      return db.select().from(collectiveAgreements).where(eq(collectiveAgreements.tenantId, access.tenant.id)).orderBy(asc(collectiveAgreements.name));
    }),
    create: protectedProcedure
      .input(z.object({ tenantId: z.number().int().positive().optional(), code: z.string().trim().min(2).max(64), name: z.string().trim().min(2).max(255), rules: z.record(z.string(), z.unknown()) }))
      .mutation(async ({ ctx, input }) => {
        const user = requireUser(ctx);
        const access = await resolveTenantAccess(user, input.tenantId);
        requireRole(access, "admin");
        requirePlanCapability(access.tenant.plan, "agreements", "Los convenios requieren plan Pro o Enterprise");
        enforcePvcu("agreement.create", access, user, { code: input.code });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const agreement = await insertAndFetch(db, collectiveAgreements, collectiveAgreements.id, { tenantId: access.tenant.id, code: input.code, name: input.name, rules: input.rules, active: 1 });
        await LedgerService.recordAuditEvent(access.tenant.id, "collective_agreement_created" as any, { agreementId: agreement.id, code: input.code, createdByUserId: user.id });
        return agreement;
      }),
  }),

  absences: router({
    list: protectedProcedure.input(tenantIdInput).query(async ({ ctx, input }) => {
      const user = requireUser(ctx);
      const access = await resolveTenantAccess(user, input?.tenantId);
      requirePlanCapability(access.tenant.plan, "absences", "Las ausencias requieren plan Pro o Enterprise");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      return db.select().from(absences).where(eq(absences.tenantId, access.tenant.id)).orderBy(desc(absences.startDate)).limit(100);
    }),
    create: protectedProcedure
      .input(z.object({ tenantId: z.number().int().positive().optional(), employeeId: z.number().int().positive(), type: z.string().trim().min(2).max(64), startDate: z.coerce.date(), endDate: z.coerce.date(), notes: z.string().max(500).optional() }))
      .mutation(async ({ ctx, input }) => {
        const user = requireUser(ctx);
        const access = await resolveTenantAccess(user, input.tenantId);
        requireRole(access, "manager");
        requirePlanCapability(access.tenant.plan, "absences", "Las ausencias requieren plan Pro o Enterprise");
        const dbCheck = await getDb();
        if (!dbCheck) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        await requireEmployeeInTenant(dbCheck, access.tenant.id, input.employeeId);
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const absence = await insertAndFetch(db, absences, absences.id, { tenantId: access.tenant.id, employeeId: input.employeeId, type: input.type, startDate: input.startDate, endDate: input.endDate, status: "approved", notes: input.notes ?? null });
        await LedgerService.recordAuditEvent(access.tenant.id, "absence_recorded" as any, { absenceId: absence.id, employeeId: input.employeeId, type: input.type, createdByUserId: user.id });
        return absence;
      }),
  }),

  scheduler: router({
    autoAssign: protectedProcedure
      .input(z.object({
        tenantId: z.number().int().positive().optional(),
        from: z.coerce.date(),
        to: z.coerce.date(),
        jurisdiction: z.enum(["ES", "PT", "FI", "EU"]).default("ES"),
        dryRun: z.boolean().default(true),
      }))
      .mutation(async ({ ctx, input }) => {
        const user = requireUser(ctx);
        const access = await resolveTenantAccess(user, input.tenantId);
        requireRole(access, "manager");
        requirePlanCapability(access.tenant.plan, "advancedCalendar", "Auto-scheduling requiere plan Pro o Enterprise");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

        const tenantEmployees = await db.select().from(employees).where(and(eq(employees.tenantId, access.tenant.id), eq(employees.active, 1)));
        const openShifts = await db.select().from(shifts).where(and(eq(shifts.tenantId, access.tenant.id), isNull(shifts.employeeId), gte(shifts.startTime, input.from), lte(shifts.endTime, input.to)));

        if (openShifts.length === 0) return { assignments: [], unassigned: [], metrics: { totalShifts: 0, assigned: 0, unassigned: 0, avgHoursPerEmployee: 0, maxHoursEmployee: null, minHoursEmployee: null } };

        const result = autoSchedule(
          tenantEmployees.map((e: typeof tenantEmployees[number]) => ({ id: e.id, name: e.name, departmentId: e.departmentId, hourlyRate: e.hourlyRate })),
          openShifts.map((s: typeof openShifts[number]) => ({ id: s.id, startTime: s.startTime, endTime: s.endTime, departmentId: s.departmentId })),
          input.jurisdiction,
        );

        if (!input.dryRun && result.assignments.length > 0) {
          for (const a of result.assignments) {
            await db.update(shifts).set({ employeeId: a.employeeId, updatedAt: new Date() }).where(and(eq(shifts.id, a.shiftId), eq(shifts.tenantId, access.tenant.id)));
          }
          await LedgerService.recordAuditEvent(access.tenant.id, "shifts_auto_assigned" as any, {
            count: result.assignments.length,
            jurisdiction: input.jurisdiction,
            assignedByUserId: user.id,
          });

          const broadcast = (globalThis as any).__aion_broadcast;
          if (broadcast) {
            broadcast(access.tenant.id, {
              type: "shifts_auto_assigned",
              count: result.assignments.length,
              jurisdiction: input.jurisdiction,
            });
          }
        }

        return { ...result, applied: !input.dryRun };
      }),
  }),

  audit: router({
    list: protectedProcedure.input(z.object({ tenantId: z.number().int().positive().optional(), limit: z.number().int().min(1).max(500).default(100) }).optional()).query(async ({ ctx, input = {} }) => {
      const user = requireUser(ctx);
      const access = await resolveTenantAccess(user, input.tenantId);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      return db.select().from(auditEvents).where(eq(auditEvents.tenantId, access.tenant.id)).orderBy(desc(auditEvents.id)).limit(input.limit ?? 100);
    }),
    verifyChain: publicProcedure.input(z.object({ tenantId: z.number().int().positive() })).query(({ input }) => LedgerService.verifyAuditChain(input.tenantId)),
  }),
});

export type AppRouter = typeof appRouter;
