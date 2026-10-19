import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Minimal schema for the AION core template.
 *
 * Mirrors `drizzle/0000_dizzy_hemingway.sql`. Only the `users` table is
 * currently required by the server (see `server/_core/sdk.ts`,
 * `server/_core/oauth.ts` and `server/_core/context.ts`).
 */
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

export const aionProjects = mysqlTable("aion_projects", {
  id: int("id").autoincrement().primaryKey(),
  // Legacy rows remain inaccessible until ownership is explicitly assigned.
  ownerId: int("ownerId"),
  name: varchar("name", { length: 255 }).notNull(),
  sourcePath: text("sourcePath").notNull(),
  sourceType: varchar("sourceType", { length: 64 }).notNull(),
  status: varchar("status", { length: 32 }).default("ready").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const aionTasks = mysqlTable("aion_tasks", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 32 }).default("pending").notNull(),
  position: int("position").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const aionExecutions = mysqlTable("aion_executions", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  command: varchar("command", { length: 255 }).notNull(),
  status: varchar("status", { length: 32 }).notNull(),
  output: text("output"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const aionMemory = mysqlTable("aion_memory", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  memoryKey: varchar("memoryKey", { length: 191 }).notNull(),
  value: text("value"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AionProject = typeof aionProjects.$inferSelect;
export type InsertAionProject = typeof aionProjects.$inferInsert;
export type AionTask = typeof aionTasks.$inferSelect;
export type InsertAionTask = typeof aionTasks.$inferInsert;
export type AionExecution = typeof aionExecutions.$inferSelect;
export type InsertAionExecution = typeof aionExecutions.$inferInsert;
export type AionMemory = typeof aionMemory.$inferSelect;
export type InsertAionMemory = typeof aionMemory.$inferInsert;
