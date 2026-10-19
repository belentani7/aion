import crypto from "node:crypto";
import { and, asc, desc, eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { auditEvents, payrollEntries, type AuditEvent, type InsertAuditEvent, type InsertPayrollEntry } from "../drizzle/schema";
import { getDb, insertAndFetch } from "./db";

function canonicalize(value: unknown): string {
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalize(record[key])}`)
    .join(",")}}`;
}

export type AuditHashInput = {
  previousHash: string | null;
  eventType: string;
  payload: unknown;
  createdAt: Date;
};

export class LedgerService {
  static canonicalize = canonicalize;

  static computeHash(input: AuditHashInput): string {
    const canonicalPayload = canonicalize({
      createdAt: input.createdAt.toISOString(),
      eventType: input.eventType,
      payload: input.payload,
      previousHash: input.previousHash ?? "GENESIS",
    });

    return crypto.createHash("sha256").update(canonicalPayload, "utf8").digest("hex");
  }

  private static async lockTenant(tx: any, tenantId: number): Promise<void> {
    await tx.execute(sql`SELECT id FROM tenants WHERE id = ${tenantId} FOR UPDATE`);
  }

  private static async appendAuditEventTx(tx: any, tenantId: number, eventType: InsertAuditEvent["eventType"], payload: unknown) {
    await this.lockTenant(tx, tenantId);

    const [lastEvent] = await tx
      .select({ currentHash: auditEvents.currentHash })
      .from(auditEvents)
      .where(eq(auditEvents.tenantId, tenantId))
      .orderBy(desc(auditEvents.id))
      .limit(1);

    // MySQL/TiDB timestamp columns persist seconds by default; hash the exact persisted instant.
    const createdAt = new Date(Math.floor(Date.now() / 1000) * 1000);
    const previousHash = lastEvent?.currentHash ?? null;
    const currentHash = this.computeHash({ previousHash, eventType, payload, createdAt });

    const inserted = await insertAndFetch(tx, auditEvents, auditEvents.id, {
      tenantId,
      eventType,
      payload: payload as Record<string, unknown>,
      previousHash,
      currentHash,
      createdAt,
    });

    return inserted;
  }

  static async recordAuditEvent(
    tenantId: number,
    eventType: InsertAuditEvent["eventType"],
    payload: unknown,
  ) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    return db.transaction((tx: any) => this.appendAuditEventTx(tx, tenantId, eventType, payload));
  }

  static async createPayrollEntry(input: {
    tenantId: number;
    employeeId: number;
    periodStart: Date;
    periodEnd: Date;
    hoursWorked: string;
    totalAmount: string;
    breakdown?: Record<string, unknown>;
  }) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    return db.transaction(async (tx: any) => {
      await this.lockTenant(tx, input.tenantId);
      const payrollDate = new Date(Math.floor(Date.now() / 1000) * 1000);
      const payrollPayload = {
        employeeId: input.employeeId,
        hoursWorked: input.hoursWorked,
        periodEnd: input.periodEnd.toISOString(),
        periodStart: input.periodStart.toISOString(),
        totalAmount: input.totalAmount,
        breakdown: input.breakdown ?? null,
      };
      const hash = crypto.createHash("sha256").update(canonicalize(payrollPayload), "utf8").digest("hex");

      const payrollValues: InsertPayrollEntry = {
        tenantId: input.tenantId,
        employeeId: input.employeeId,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        hoursWorked: input.hoursWorked,
        totalAmount: input.totalAmount,
        hash,
        payrollDate,
      };
      const entry = await insertAndFetch(tx, payrollEntries, payrollEntries.id, payrollValues);

      await this.appendAuditEventTx(tx, input.tenantId, "payroll_calculated", {
        employeeId: input.employeeId,
        hoursWorked: input.hoursWorked,
        payrollEntryId: entry.id,
        periodEnd: input.periodEnd.toISOString(),
        periodStart: input.periodStart.toISOString(),
        totalAmount: input.totalAmount,
        payrollHash: hash,
        breakdown: input.breakdown ?? null,
      });

      return entry;
    });
  }

  static async getPublicAuditChain(tenantId: number, limit = 1000) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const events = await db
      .select({ id: auditEvents.id, eventType: auditEvents.eventType, previousHash: auditEvents.previousHash, currentHash: auditEvents.currentHash, createdAt: auditEvents.createdAt })
      .from(auditEvents)
      .where(eq(auditEvents.tenantId, tenantId))
      .orderBy(asc(auditEvents.id))
      .limit(Math.min(Math.max(limit, 1), 1000));
    const verification = await this.verifyAuditChain(tenantId);
    return { tenantId, events, verification };
  }

  private static hashMatchesPersistedEvent(event: AuditEvent): boolean {
    const input = { previousHash: event.previousHash, eventType: event.eventType, payload: event.payload, createdAt: event.createdAt };
    if (this.computeHash(input) === event.currentHash) return true;
    // Legacy compatibility: the first implementation hashed milliseconds before MySQL stored seconds;
    // a slow insert could also cross a second boundary, so tolerate a bounded ±5 second window only for old rows.
    const base = event.createdAt.getTime();
    for (let milliseconds = -5000; milliseconds <= 5000; milliseconds += 1) {
      if (this.computeHash({ ...input, createdAt: new Date(base + milliseconds) }) === event.currentHash) return true;
    }
    return false;
  }

  static async verifyAuditChain(tenantId: number): Promise<{
    valid: boolean;
    totalEvents: number;
    brokenAtIndex?: number;
    reason?: string;
  }> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const events = await db
      .select()
      .from(auditEvents)
      .where(eq(auditEvents.tenantId, tenantId))
      .orderBy(asc(auditEvents.id));

    let previousHash: string | null = null;
    for (let index = 0; index < events.length; index += 1) {
      const event = events[index];
      if (event.previousHash !== previousHash) {
        return { valid: false, totalEvents: events.length, brokenAtIndex: index, reason: "previous_hash_mismatch" };
      }

      if (!this.hashMatchesPersistedEvent(event)) {
        return { valid: false, totalEvents: events.length, brokenAtIndex: index, reason: "current_hash_mismatch" };
      }
      previousHash = event.currentHash;
    }

    return { valid: true, totalEvents: events.length };
  }
}
