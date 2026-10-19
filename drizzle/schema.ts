import { relations } from "drizzle-orm";
import {
  boolean,
  decimal,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const userRoleEnum = mysqlEnum("role", ["user", "admin"]);
export const tenantMemberRoleEnum = mysqlEnum("role", ["owner", "admin", "manager", "employee"]);
export const memberStatusEnum = mysqlEnum("status", ["active", "invited", "suspended"]);
export const shiftStatusEnum = mysqlEnum("status", ["scheduled", "completed", "cancelled", "pending_approval"]);
export const planTypeEnum = mysqlEnum("plan", ["free", "pro", "enterprise"]);
export const incidentStatusEnum = mysqlEnum("status", ["open", "investigating", "resolved"]);
export const incidentSeverityEnum = mysqlEnum("severity", ["low", "medium", "high", "critical"]);
export const eventTypeEnum = mysqlEnum("eventType", [
  "shift_created",
  "shift_updated",
  "shift_deleted",
  "payroll_calculated",
  "employee_created",
  "employee_updated",
  "employee_deleted",
  "incident_created",
  "incident_updated",
  "tenant_created",
  "member_added",
  "member_role_updated",
  "plan_updated",
  "collective_agreement_created",
  "absence_recorded",
]);

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const tenants = mysqlTable("tenants", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }).unique(),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }).unique(),
  plan: mysqlEnum("plan", ["free", "pro", "enterprise"]).default("free").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = typeof tenants.$inferInsert;

export const tenantMembers = mysqlTable(
  "tenant_members",
  {
    id: int("id").autoincrement().primaryKey(),
    tenantId: int("tenantId").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: mysqlEnum("role", ["owner", "admin", "manager", "employee"]).default("employee").notNull(),
    status: mysqlEnum("status", ["active", "invited", "suspended"]).default("active").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    tenantUserUnique: uniqueIndex("tenant_members_tenant_user_unique").on(table.tenantId, table.userId),
    userLookup: index("tenant_members_user_lookup").on(table.userId, table.status),
  }),
);

export type TenantMember = typeof tenantMembers.$inferSelect;
export type InsertTenantMember = typeof tenantMembers.$inferInsert;

export const departments = mysqlTable(
  "departments",
  {
    id: int("id").autoincrement().primaryKey(),
    tenantId: int("tenantId").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    tenantNameUnique: uniqueIndex("departments_tenant_name_unique").on(table.tenantId, table.name),
    tenantLookup: index("departments_tenant_lookup").on(table.tenantId),
  }),
);

export type Department = typeof departments.$inferSelect;
export type InsertDepartment = typeof departments.$inferInsert;

export const employees = mysqlTable(
  "employees",
  {
    id: int("id").autoincrement().primaryKey(),
    tenantId: int("tenantId").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    departmentId: int("departmentId").references(() => departments.id, { onDelete: "set null" }),
    name: varchar("name", { length: 255 }).notNull(),
    role: mysqlEnum("role", ["owner", "admin", "manager", "employee"]).default("employee").notNull(),
    hourlyRate: decimal("hourlyRate", { precision: 10, scale: 2 }).notNull().default("0.00"),
    active: int("active").notNull().default(1),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    tenantLookup: index("employees_tenant_lookup").on(table.tenantId, table.active),
    departmentLookup: index("employees_department_lookup").on(table.tenantId, table.departmentId),
  }),
);

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = typeof employees.$inferInsert;

export const shifts = mysqlTable(
  "shifts",
  {
    id: int("id").autoincrement().primaryKey(),
    tenantId: int("tenantId").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    employeeId: int("employeeId").references(() => employees.id, { onDelete: "set null" }),
    departmentId: int("departmentId").references(() => departments.id, { onDelete: "set null" }),
    startTime: timestamp("startTime").notNull(),
    endTime: timestamp("endTime").notNull(),
    status: mysqlEnum("status", ["scheduled", "completed", "cancelled", "pending_approval"]).default("scheduled").notNull(),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    tenantTimeLookup: index("shifts_tenant_time_lookup").on(table.tenantId, table.startTime, table.endTime),
    employeeTimeLookup: index("shifts_employee_time_lookup").on(table.tenantId, table.employeeId, table.startTime),
  }),
);

export type Shift = typeof shifts.$inferSelect;
export type InsertShift = typeof shifts.$inferInsert;

export const payrollEntries = mysqlTable(
  "payroll_entries",
  {
    id: int("id").autoincrement().primaryKey(),
    tenantId: int("tenantId").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    employeeId: int("employeeId").notNull().references(() => employees.id, { onDelete: "cascade" }),
    periodStart: timestamp("periodStart").notNull(),
    periodEnd: timestamp("periodEnd").notNull(),
    hoursWorked: decimal("hoursWorked", { precision: 10, scale: 2 }).notNull(),
    totalAmount: decimal("totalAmount", { precision: 12, scale: 2 }).notNull(),
    hash: varchar("hash", { length: 64 }).notNull(),
    payrollDate: timestamp("payrollDate").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    tenantPeriodLookup: index("payroll_tenant_period_lookup").on(table.tenantId, table.periodStart, table.periodEnd),
    employeePeriodLookup: index("payroll_employee_period_lookup").on(table.tenantId, table.employeeId, table.periodEnd),
  }),
);

export type PayrollEntry = typeof payrollEntries.$inferSelect;
export type InsertPayrollEntry = typeof payrollEntries.$inferInsert;

export const incidents = mysqlTable(
  "incidents",
  {
    id: int("id").autoincrement().primaryKey(),
    tenantId: int("tenantId").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    employeeId: int("employeeId").notNull().references(() => employees.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 180 }).notNull(),
    description: text("description").notNull(),
    severity: mysqlEnum("severity", ["low", "medium", "high", "critical"]).default("medium").notNull(),
    status: mysqlEnum("status", ["open", "investigating", "resolved"]).default("open").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    tenantIncidentLookup: index("incidents_tenant_lookup").on(table.tenantId, table.status, table.createdAt),
    employeeIncidentLookup: index("incidents_employee_lookup").on(table.tenantId, table.employeeId, table.createdAt),
  }),
);

export type Incident = typeof incidents.$inferSelect;
export type InsertIncident = typeof incidents.$inferInsert;

export const collectiveAgreements = mysqlTable(
  "collective_agreements",
  {
    id: int("id").autoincrement().primaryKey(),
    tenantId: int("tenantId").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 64 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    rules: json("rules").notNull(),
    active: int("active").notNull().default(1),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    tenantLookup: index("agreements_tenant_lookup").on(table.tenantId, table.active),
  }),
);

export type CollectiveAgreement = typeof collectiveAgreements.$inferSelect;
export type InsertCollectiveAgreement = typeof collectiveAgreements.$inferInsert;

export const absences = mysqlTable(
  "absences",
  {
    id: int("id").autoincrement().primaryKey(),
    tenantId: int("tenantId").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    employeeId: int("employeeId").notNull().references(() => employees.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 64 }).notNull(),
    startDate: timestamp("startDate").notNull(),
    endDate: timestamp("endDate").notNull(),
    status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("approved").notNull(),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    tenantLookup: index("absences_tenant_lookup").on(table.tenantId, table.startDate, table.endDate),
  }),
);

export type Absence = typeof absences.$inferSelect;
export type InsertAbsence = typeof absences.$inferInsert;

export const auditEvents = mysqlTable(
  "audit_events",
  {
    id: int("id").autoincrement().primaryKey(),
    tenantId: int("tenantId").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    eventType: mysqlEnum("eventType", [
      "shift_created",
      "shift_updated",
      "shift_deleted",
      "payroll_calculated",
      "employee_created",
      "employee_updated",
      "employee_deleted",
      "incident_created",
      "incident_updated",
      "tenant_created",
      "member_added",
      "member_role_updated",
      "plan_updated",
    ]).notNull(),
    payload: json("payload").notNull(),
    previousHash: varchar("previousHash", { length: 64 }),
    currentHash: varchar("currentHash", { length: 64 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    tenantChainLookup: index("audit_tenant_chain_lookup").on(table.tenantId, table.id),
    hashLookup: index("audit_current_hash_lookup").on(table.currentHash),
  }),
);

export type AuditEvent = typeof auditEvents.$inferSelect;
export type InsertAuditEvent = typeof auditEvents.$inferInsert;

export const webhookEvents = mysqlTable("webhook_events", {
  id: varchar("id", { length: 255 }).primaryKey(),
  type: varchar("type", { length: 120 }).notNull(),
  receivedAt: timestamp("receivedAt").defaultNow().notNull(),
});

export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type InsertWebhookEvent = typeof webhookEvents.$inferInsert;

export const tenantsRelations = relations(tenants, ({ many }) => ({
  members: many(tenantMembers),
  departments: many(departments),
  employees: many(employees),
  shifts: many(shifts),
  payrollEntries: many(payrollEntries),
  incidents: many(incidents),
  auditEvents: many(auditEvents),
}));

export const usersRelations = relations(users, ({ many }) => ({ memberships: many(tenantMembers) }));
export const tenantMembersRelations = relations(tenantMembers, ({ one }) => ({
  tenant: one(tenants, { fields: [tenantMembers.tenantId], references: [tenants.id] }),
  user: one(users, { fields: [tenantMembers.userId], references: [users.id] }),
}));
export const departmentsRelations = relations(departments, ({ one, many }) => ({
  tenant: one(tenants, { fields: [departments.tenantId], references: [tenants.id] }),
  employees: many(employees),
  shifts: many(shifts),
}));
export const employeesRelations = relations(employees, ({ one, many }) => ({
  tenant: one(tenants, { fields: [employees.tenantId], references: [tenants.id] }),
  department: one(departments, { fields: [employees.departmentId], references: [departments.id] }),
  shifts: many(shifts),
  payrollEntries: many(payrollEntries),
  incidents: many(incidents),
}));
export const shiftsRelations = relations(shifts, ({ one }) => ({
  tenant: one(tenants, { fields: [shifts.tenantId], references: [tenants.id] }),
  employee: one(employees, { fields: [shifts.employeeId], references: [employees.id] }),
  department: one(departments, { fields: [shifts.departmentId], references: [departments.id] }),
}));
export const payrollEntriesRelations = relations(payrollEntries, ({ one }) => ({
  tenant: one(tenants, { fields: [payrollEntries.tenantId], references: [tenants.id] }),
  employee: one(employees, { fields: [payrollEntries.employeeId], references: [employees.id] }),
}));
export const incidentsRelations = relations(incidents, ({ one }) => ({
  tenant: one(tenants, { fields: [incidents.tenantId], references: [tenants.id] }),
  employee: one(employees, { fields: [incidents.employeeId], references: [employees.id] }),
}));
export const auditEventsRelations = relations(auditEvents, ({ one }) => ({
  tenant: one(tenants, { fields: [auditEvents.tenantId], references: [tenants.id] }),
}));

export const aionProjects = mysqlTable("aion_projects", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  sourcePath: varchar("source_path", { length: 1024 }).notNull(),
  sourceType: varchar("source_type", { length: 64 }).notNull(),
  status: varchar("status", { length: 32 }).notNull().default("ready"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const aionTasks = mysqlTable("aion_tasks", {
  id: int("id").primaryKey().autoincrement(),
  projectId: int("project_id").notNull(),
  title: varchar("title", { length: 512 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 32 }).notNull().default("pending"),
  position: int("position").notNull().default(0),
});

export const aionExecutions = mysqlTable("aion_executions", {
  id: int("id").primaryKey().autoincrement(),
  projectId: int("project_id").notNull(),
  command: varchar("command", { length: 512 }).notNull(),
  status: varchar("status", { length: 32 }).notNull(),
  output: text("output"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const aionMemory = mysqlTable("aion_memory", {
  id: int("id").primaryKey().autoincrement(),
  projectId: int("project_id").notNull(),
  memoryKey: varchar("memory_key", { length: 255 }).notNull(),
  value: text("value"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const planLimits = {
  free: { employees: 5, auditExport: false, advancedCalendar: false, incidents: false, agreements: false, absences: false, retentionDays: 7, unlimitedHistory: false },
  pro: { employees: 100, auditExport: true, advancedCalendar: true, incidents: true, agreements: true, absences: true, retentionDays: 365, unlimitedHistory: false },
  enterprise: { employees: Number.MAX_SAFE_INTEGER, auditExport: true, advancedCalendar: true, incidents: true, agreements: true, absences: true, retentionDays: 2555, unlimitedHistory: true },
} as const;

export type PlanType = keyof typeof planLimits;
export type TenantMemberRole = "owner" | "admin" | "manager" | "employee";
export const roleRank: Record<TenantMemberRole, number> = { employee: 10, manager: 20, admin: 30, owner: 40 };
