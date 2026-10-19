import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { createPool, type Pool } from "mysql2/promise";
import {
  aionExecutions,
  aionMemory,
  aionProjects,
  aionTasks,
  InsertUser,
  tenantMembers,
  tenants,
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
      console.warn("[Database] Failed to initialize:", error);
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
  if (user.openId === ENV.ownerOpenId) await ensureOwnerTenantMembership(user.openId);
}

/** Owner-only onboarding bridge for the existing Manus project. */
export async function ensureOwnerTenantMembership(openId: string): Promise<void> {
  if (!ENV.ownerOpenId || openId !== ENV.ownerOpenId) return;
  const db = await getDb();
  if (!db) return;

  const [owner] = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  if (!owner) return;
  const [existingMembership] = await db.select().from(tenantMembers).where(eq(tenantMembers.userId, owner.id)).limit(1);
  if (existingMembership) return;

  const [existingTenant] = await db.select().from(tenants).orderBy(tenants.id).limit(1);
  const tenant = existingTenant ?? await insertAndFetch(db, tenants, tenants.id, { name: owner.name ? `${owner.name} Workforce` : "Mi empresa AION", plan: "free" });
  const tenantId = Number(tenant?.id);
  const userId = Number(owner?.id);
  if (!Number.isInteger(tenantId) || tenantId <= 0 || !Number.isInteger(userId) || userId <= 0) {
    throw new Error("Owner onboarding resolved invalid tenant/user identifiers");
  }
  await db.insert(tenantMembers).values({ tenantId, userId, role: "owner", status: "active" }).onDuplicateKeyUpdate({ set: { role: "owner", status: "active" } });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function insertAndFetch<TTable extends Record<string, any>>(
  db: any,
  table: TTable,
  idColumn: any,
  values: Record<string, unknown>,
) {
  const [{ id }] = await db.insert(table).values(values).$returningId();
  const [row] = await db.select().from(table).where(eq(idColumn, id)).limit(1);
  return row;
}

export async function updateAndFetch(
  db: any,
  table: any,
  whereClause: any,
  values: Record<string, unknown>,
) {
  await db.update(table).set(values).where(whereClause);
  const [row] = await db.select().from(table).where(whereClause).limit(1);
  return row;
}

/**
 * Borra los datos AION en una transacción cuando hay DB y siempre limpia el
 * almacén en memoria. Los fallos de DB se propagan para no ocultar un borrado incompleto.
 */
export async function deleteProjectData(projectId: number): Promise<void> {
  const db = await getDb();
  try {
    if (!db) return;
    await db.transaction(async (tx: typeof db) => {
      await tx.delete(aionMemory).where(eq(aionMemory.projectId, projectId));
      await tx.delete(aionExecutions).where(eq(aionExecutions.projectId, projectId));
      await tx.delete(aionTasks).where(eq(aionTasks.projectId, projectId));
      await tx.delete(aionProjects).where(eq(aionProjects.id, projectId));
    });
  } finally {
    clearProjectFromMemory(projectId);
  }
}
