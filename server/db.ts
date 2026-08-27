import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, projects, auditFindings, executions, approvals, sessionMemory, tasks } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); }
    catch (error) { console.warn("[Database] Failed to connect:", error); _db = null; }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) { values[field] = user[field] ?? null; updateSet[field] = user[field] ?? null; }
  }
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  values.lastSignedIn ??= new Date();
  if (!Object.keys(updateSet).length) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function listProjects() { const db = await getDb(); return db ? db.select().from(projects).orderBy(desc(projects.updatedAt)) : []; }
export async function getProject(id: number) { const db = await getDb(); if (!db) return undefined; return (await db.select().from(projects).where(eq(projects.id, id)).limit(1))[0]; }
export async function insertProject(value: typeof projects.$inferInsert) { const db = await getDb(); if (!db) return null; const result = await db.insert(projects).values(value); return Number(result[0].insertId); }
export async function insertFinding(value: typeof auditFindings.$inferInsert) { const db = await getDb(); if (!db) return; await db.insert(auditFindings).values(value); }
export async function listFindings(projectId: number) { const db = await getDb(); return db ? db.select().from(auditFindings).where(eq(auditFindings.projectId, projectId)).orderBy(desc(auditFindings.createdAt)) : []; }
export async function insertTask(value: typeof tasks.$inferInsert) { const db = await getDb(); if (!db) return null; const result = await db.insert(tasks).values(value); return Number(result[0].insertId); }
export async function listTasks(projectId?: number) { const db = await getDb(); if (!db) return []; return projectId ? db.select().from(tasks).where(eq(tasks.projectId, projectId)).orderBy(desc(tasks.updatedAt)) : db.select().from(tasks).orderBy(desc(tasks.updatedAt)); }
export async function insertExecution(value: typeof executions.$inferInsert) { const db = await getDb(); if (!db) return; await db.insert(executions).values(value); }
export async function listExecutions(projectId?: number) { const db = await getDb(); if (!db) return []; return projectId ? db.select().from(executions).where(eq(executions.projectId, projectId)).orderBy(desc(executions.createdAt)) : db.select().from(executions).orderBy(desc(executions.createdAt)); }
export async function insertApproval(value: typeof approvals.$inferInsert) { const db = await getDb(); if (!db) return null; const result = await db.insert(approvals).values(value); return Number(result[0].insertId); }
export async function listApprovals() { const db = await getDb(); return db ? db.select().from(approvals).where(eq(approvals.status, "pending")).orderBy(desc(approvals.createdAt)) : []; }
export async function getApproval(id: number) { const db = await getDb(); if (!db) return undefined; return (await db.select().from(approvals).where(eq(approvals.id, id)).limit(1))[0]; }
export async function resolveApproval(id: number, status: "approved" | "rejected") { const db = await getDb(); if (!db) return; await db.update(approvals).set({ status, resolvedAt: new Date() }).where(eq(approvals.id, id)); }
export async function listMemory(projectId?: number) { const db = await getDb(); if (!db) return []; return projectId ? db.select().from(sessionMemory).where(eq(sessionMemory.projectId, projectId)).orderBy(desc(sessionMemory.updatedAt)) : db.select().from(sessionMemory).orderBy(desc(sessionMemory.updatedAt)); }
export async function saveMemory(value: typeof sessionMemory.$inferInsert) { const db = await getDb(); if (!db) return; await db.insert(sessionMemory).values(value); }
export async function deleteProjectData(projectId: number) { const db = await getDb(); if (!db) return; await db.delete(auditFindings).where(eq(auditFindings.projectId, projectId)); await db.delete(tasks).where(eq(tasks.projectId, projectId)); await db.delete(executions).where(eq(executions.projectId, projectId)); await db.delete(sessionMemory).where(eq(sessionMemory.projectId, projectId)); await db.delete(projects).where(eq(projects.id, projectId)); }
