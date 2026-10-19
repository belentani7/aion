import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { createPool } from "mysql2/promise";
import {
  aionExecutions,
  aionMemory,
  aionProjects,
  aionTasks,
  type InsertUser,
  users,
} from "../drizzle/schema";
import { clearProjectFromMemory } from "./aion/store";
import { ENV } from "./_core/env";

let _db: any = null;
let _pool: any = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _pool = createPool({
        uri: process.env.DATABASE_URL,
        connectionLimit: Number(process.env.DB_POOL_MAX ?? 10),
        idleTimeout: 30,
        enableKeepAlive: true,
      });
      _db = drizzle(_pool);
    } catch (error) {
      console.warn("[Database] Failed to initialize; verify configuration");
      _db = null;
    }
  }
  return _db;
}

export async function closeDb(): Promise<void> {
  if (_pool) await _pool.end();
  _pool = null;
  _db = null;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

/**
 * Removes an AION project and every artifact it owns (tasks, executions and
 * memory). Falls back to clearing the in-memory store when no database is
 * configured, so the cleanup contract holds in tests and local development.
 */
export async function deleteProjectData(projectId: number): Promise<void> {
  const db = await getDb();
  if (db) {
    try {
      await db.delete(aionTasks).where(eq(aionTasks.projectId, projectId));
      await db.delete(aionExecutions).where(eq(aionExecutions.projectId, projectId));
      await db.delete(aionMemory).where(eq(aionMemory.projectId, projectId));
      await db.delete(aionProjects).where(eq(aionProjects.id, projectId));
    } catch (error) {
      console.warn("[AION] deleteProjectData: database cleanup failed:", error);
    }
  }
  clearProjectFromMemory(projectId);
}
