import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

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

export const projects = mysqlTable("aion_projects", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 180 }).notNull(),
  sourcePath: text("sourcePath").notNull(),
  sourceType: mysqlEnum("sourceType", ["server_path", "git_url"]).notNull(),
  status: mysqlEnum("status", ["ready", "needs_approval", "error"]).default("ready").notNull(),
  summary: text("summary"),
  structure: text("structure"),
  dependencies: text("dependencies"),
  entrypoints: text("entrypoints"),
  risks: text("risks"),
  pending: text("pending"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const auditFindings = mysqlTable("aion_audit_findings", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  category: varchar("category", { length: 64 }).notNull(),
  severity: mysqlEnum("severity", ["high", "medium", "low", "info"]).notNull(),
  priority: int("priority").default(50).notNull(),
  impact: varchar("impact", { length: 32 }).default("medium").notNull(),
  effort: varchar("effort", { length: 32 }).default("medium").notNull(),
  title: varchar("title", { length: 220 }).notNull(),
  detail: text("detail").notNull(),
  evidence: text("evidence"),
  status: mysqlEnum("status", ["open", "accepted", "resolved"]).default("open").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const tasks = mysqlTable("aion_tasks", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId"),
  title: varchar("title", { length: 220 }).notNull(),
  status: mysqlEnum("status", ["planned", "running", "completed", "blocked", "not_implemented"]).default("planned").notNull(),
  riskLevel: mysqlEnum("riskLevel", ["low", "medium", "high"]).default("low").notNull(),
  dependsOn: text("dependsOn"),
  result: text("result"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const executions = mysqlTable("aion_executions", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId"),
  toolName: varchar("toolName", { length: 100 }).notNull(),
  riskLevel: mysqlEnum("riskLevel", ["low", "medium", "high"]).notNull(),
  status: mysqlEnum("status", ["completed", "blocked", "not_implemented", "failed"]).notNull(),
  input: text("input"),
  output: text("output"),
  approvalRequired: int("approvalRequired").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const approvals = mysqlTable("aion_approvals", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId"),
  action: varchar("action", { length: 220 }).notNull(),
  riskLevel: mysqlEnum("riskLevel", ["medium", "high"]).notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  reason: text("reason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  resolvedAt: timestamp("resolvedAt"),
});

export const sessionMemory = mysqlTable("aion_session_memory", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId"),
  key: varchar("key", { length: 160 }).notNull(),
  value: text("value").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type AuditFinding = typeof auditFindings.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type Execution = typeof executions.$inferSelect;
export type Approval = typeof approvals.$inferSelect;
