import { desc, eq } from "drizzle-orm";
import { COOKIE_NAME } from "@shared/const";
import { payrollEntries } from "../drizzle/schema";
import { aionRouter } from "./aion/router";
import { getDb } from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { requirePlanCapability } from "./plan-policy";
import { defaultProfile, type RiskClass } from "./pvcu";
import { openDataSources } from "./open-data";
import { requireRole, resolveTenantAccess } from "./tenant-context";

function csvCell(value: string | number | Date | null | undefined): string {
  const raw = value instanceof Date ? value.toISOString() : String(value ?? "");
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

export const appRouter = router({
  system: systemRouter,

  aion: aionRouter,

  // Authenticated, read-only configuration catalogue. This is NOT a claim
  // that external data sources are live or the profiles are certified.
  validation: router({
    profiles: protectedProcedure.query(() =>
      (["low", "medium", "high", "critical"] as const satisfies readonly RiskClass[])
        .map((risk) => defaultProfile(risk))
    ),
    openDataSources: protectedProcedure.query(() => openDataSources),
  }),

  payroll: router({
    csv: protectedProcedure.query(async ({ ctx }) => {
      const access = await resolveTenantAccess(ctx.user);
      requireRole(access, "manager");
      requirePlanCapability(access.tenant.plan, "auditExport", "La exportación CSV requiere un plan Pro o Enterprise.");
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const rows = await db
        .select()
        .from(payrollEntries)
        .where(eq(payrollEntries.tenantId, access.tenant.id))
        .orderBy(desc(payrollEntries.payrollDate));

      const header = ["id", "employeeId", "periodStart", "periodEnd", "hoursWorked", "totalAmount", "payrollDate", "hash"];
      const body = rows.map((row: typeof payrollEntries.$inferSelect) => [
        row.id, row.employeeId, row.periodStart, row.periodEnd,
        row.hoursWorked, row.totalAmount, row.payrollDate, row.hash,
      ].map(csvCell).join(","));
      return {
        filename: `payroll-tenant-${access.tenant.id}.csv`,
        mimeType: "text/csv; charset=utf-8",
        rowCount: rows.length,
        csv: [header.map(csvCell).join(","), ...body].join("\r\n"),
      };
    }),
  }),

  auth: router({
    me: publicProcedure.query(({ ctx }) => ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
});

export type AppRouter = typeof appRouter;
