---
name: aion-audit-trail
description: Use when working with AION's immutable SHA-256 hash chain audit trail. Covers recording, verification, and public endpoint.
---

# AION Audit Trail Skill

## Overview
AION uses a **SHA-256 hash chain** for immutable audit trails. Every event links to the previous via hash. Deterministic recomputation enables external verification.

## When to Use
- Recording audit events (any mutation)
- Implementing verification logic
- Working with public `/api/audit/verify` endpoint
- Debugging hash chain issues

## Core Rules

### 1. Hash Computation (Deterministic!)
```typescript
// ✅ CORRECT - deterministic
function computeHash(prevHash: string, payload: object, sequence: number): string {
  const payloadHash = sha256(canonicalJson(payload));
  const input = `${prevHash}|${payloadHash}|${sequence}`;
  return sha256(input);
}

// ❌ WRONG - uses Date.now() (previous bug)
function computeHashBroken(prevHash: string, payload: object): string {
  return sha256(`${prevHash}|${JSON.stringify(payload)}|${Date.now()}`);
}
```

### 2. Event Structure
```typescript
interface AuditEvent {
  id: number;              // BIGINT AUTO_INCREMENT (sequence)
  tenantId: string;
  eventType: string;       // SHIFT_CREATED, PAYROLL_CALCULATED, etc.
  payloadHash: string;     // SHA256(canonicalJson(payload))
  prevHash: string;        // Previous event's currentHash
  currentHash: string;     // SHA256(prevHash|payloadHash|sequence)
  actorId?: string;
  createdAt: Date;         // TIMESTAMP(6) microsecond
}
```

### 3. Recording Events
```typescript
await ledgerService.recordAuditEvent({
  tenantId: ctx.tenantId,
  eventType: 'SHIFT_CREATED',
  payload: { shiftId, employeeId, startAt, endAt },
  actorId: ctx.userId,
});
```

### 4. Public Verification Endpoint
```
GET /api/audit/verify?tenantId=X&from=1&to=1000
Response: { valid: boolean, proof: [{sequence, currentHash}], mismatchAt?: number }
```

## Verification Algorithm
```typescript
function verifyChain(events: AuditEvent[], genesisHash: string): VerificationResult {
  let current = genesisHash;
  for (const event of events) {
    const expected = computeHash(current, event.payload, event.sequence);
    if (expected !== event.currentHash) {
      return { valid: false, mismatchAt: event.sequence };
    }
    current = event.currentHash;
  }
  return { valid: true, proof: events.map(e => ({ sequence: e.id, currentHash: e.currentHash })) };
}
```

## Red Flags
| Thought | Reality |
|---------|---------|
| "I'll use Date.now() for uniqueness" | Breaks verification - use sequence |
| "Payload order doesn't matter" | Use canonicalJson (stable key sort) |
| "Internal only, no public verify" | Public endpoint is compliance requirement |

## Tests
- `tests/adversarial/hash-tampering.test.ts` — Single-bit flip detected at correct index
- `tests/integration/audit.test.ts` — Full chain recording + verification

## Related
- ADR-0003: SHA-256 Hash Chain
- `server/ledger.service.ts`
- `server/modules/audit/`