import { asc, eq } from "drizzle-orm";
import { auditEvents } from "../drizzle/schema";
import { closeDb, getDb } from "../server/db";
import { LedgerService } from "../server/ledger.service";

const db = await getDb();
if (!db) throw new Error("Database unavailable");
const events = await db.select().from(auditEvents).where(eq(auditEvents.tenantId, 1)).orderBy(asc(auditEvents.id)).limit(3);
for (const event of events) {
  const createdAt = event.createdAt instanceof Date ? event.createdAt : new Date(event.createdAt as unknown as string);
  let matches = false;
  for (let offset = 0; offset < 1000; offset += 1) {
    const candidate = LedgerService.computeHash({ previousHash: event.previousHash, eventType: event.eventType, payload: event.payload, createdAt: new Date(createdAt.getTime() + offset) });
    if (candidate === event.currentHash) { matches = true; break; }
  }
  console.log(JSON.stringify({ id: event.id, createdAtType: typeof event.createdAt, createdAt: createdAt.toISOString(), payload: event.payload, previousHash: event.previousHash, currentHash: event.currentHash, matchesWithinSecond: matches }, null, 2));
}
await closeDb();
