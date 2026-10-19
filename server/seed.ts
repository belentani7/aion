import { eq } from "drizzle-orm";
import { closeDb, getDb, insertAndFetch } from "./db";
import { departments, employees, shifts, tenantMembers, tenants, users } from "../drizzle/schema";
import { LedgerService } from "./ledger.service";

/** Seed explícito para entornos locales/staging. No se ejecuta al arrancar el servidor. */
export async function seedDatabase() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_SEED !== "true") {
    throw new Error("Seed bloqueado en producción: define ALLOW_SEED=true sólo durante una operación controlada");
  }

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(users).values({ openId: "seed-owner-aion", name: "AION Demo Owner", email: "demo@aion.local", role: "admin", loginMethod: "seed" }).onDuplicateKeyUpdate({ set: { name: "AION Demo Owner", role: "admin", updatedAt: new Date() } });
  const [demoUser] = await db.select().from(users).where(eq(users.openId, "seed-owner-aion")).limit(1);

  const [existingTenant] = await db.select().from(tenants).orderBy(tenants.id).limit(1);
  let tenant = existingTenant;
  if (!tenant) {
    tenant = await insertAndFetch(db, tenants, tenants.id, { name: "Logística Global AION S.A.", plan: "enterprise" });
    await LedgerService.recordAuditEvent(tenant.id, "tenant_created", { tenantName: tenant.name, plan: tenant.plan, createdByUserId: demoUser.id });
  }

  const [existingEmployee] = await db.select().from(employees).where(eq(employees.tenantId, tenant.id)).limit(1);
  if (existingEmployee) {
    console.log(`[Seed] El tenant ${tenant.id} ya contiene datos; no se modifica.`);
    return tenant;
  }

  await db.insert(tenantMembers).values({ tenantId: tenant.id, userId: demoUser.id, role: "owner", status: "active" }).onDuplicateKeyUpdate({ set: { role: "owner", status: "active" } });
  const operations = await insertAndFetch(db, departments, departments.id, { tenantId: tenant.id, name: "Operaciones" });
  const employeeData = [
    { name: "Carlos Mendoza", role: "manager" as const, hourlyRate: "22.50" },
    { name: "Ana Belén Gómez", role: "employee" as const, hourlyRate: "16.00" },
    { name: "Javier Ruiz", role: "employee" as const, hourlyRate: "15.50" },
    { name: "María José Ramos", role: "employee" as const, hourlyRate: "18.00" },
    { name: "David Fernández", role: "employee" as const, hourlyRate: "17.25" },
  ];

  const createdEmployees = [];
  for (const item of employeeData) {
    const employee = await insertAndFetch(db, employees, employees.id, { tenantId: tenant.id, departmentId: operations.id, name: item.name, role: item.role, hourlyRate: item.hourlyRate, active: 1 });
    createdEmployees.push(employee);
    await LedgerService.recordAuditEvent(tenant.id, "employee_created", { employeeId: employee.id, name: employee.name, role: employee.role });
  }

  const now = new Date();
  const periodStart = new Date(now);
  periodStart.setDate(periodStart.getDate() - 14);
  periodStart.setHours(0, 0, 0, 0);
  const periodEnd = new Date(now);
  periodEnd.setHours(23, 59, 59, 999);

  for (let i = 0; i < 10; i += 1) {
    const employee = createdEmployees[i % createdEmployees.length];
    const startTime = new Date(periodStart);
    startTime.setDate(periodStart.getDate() + i);
    startTime.setHours(8, 0, 0, 0);
    const endTime = new Date(startTime);
    endTime.setHours(16, 0, 0, 0);
    const shift = await insertAndFetch(db, shifts, shifts.id, { tenantId: tenant.id, employeeId: employee.id, departmentId: operations.id, startTime, endTime, status: i < 5 ? "completed" : "scheduled", notes: "Turno de demostración" });
    await LedgerService.recordAuditEvent(tenant.id, "shift_created", { shiftId: shift.id, employeeId: employee.id, startTime: startTime.toISOString(), endTime: endTime.toISOString() });
    if (i < 5) {
      const hoursWorked = "8.00";
      const totalAmount = (8 * Number(employee.hourlyRate)).toFixed(2);
      await LedgerService.createPayrollEntry({ tenantId: tenant.id, employeeId: employee.id, periodStart, periodEnd, hoursWorked, totalAmount });
    }
  }

  console.log(`[Seed] Tenant ${tenant.id}, ${createdEmployees.length} empleados y 10 turnos creados.`);
  return tenant;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase()
    .catch((error) => {
      console.error("[Seed Error]", error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await closeDb();
    });
}
