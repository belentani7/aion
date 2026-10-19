---
name: aion-tenant-isolation
description: Use when implementing or debugging multi-tenant data isolation in AION. Ensures zero data leakage between tenants.
---

# AION Tenant Isolation Skill

## Overview
AION uses **application-layer tenant isolation** (not PostgreSQL RLS) because the managed database is MySQL/TiDB. Every query MUST include `tenant_id` filter.

## When to Use
- Writing any database query (SELECT, INSERT, UPDATE, DELETE)
- Implementing new tRPC procedures
- Debugging cross-tenant data leakage
- Code review for tenant isolation

## Core Rules

### 1. Every Query Needs Tenant Filter
```typescript
// ❌ FORBIDDEN
const shifts = await db.select().from(shiftTable);

// ✅ REQUIRED
const shifts = await db.select()
  .from(shiftTable)
  .where(eq(shiftTable.tenantId, ctx.tenantId));
```

### 2. Defensive Joins
```sql
-- Always include tenant_id on both sides
SELECT * FROM shift s
JOIN employee e ON s.employee_id = e.id 
  AND s.tenant_id = e.tenant_id  -- DEFENSIVE
WHERE s.tenant_id = ?
```

### 3. Use Helper Function
```typescript
import { withTenant } from '@/server/shared/tenant';

const shifts = await withTenant(ctx, (qb) => 
  qb.select().from(shiftTable)
);
```

### 4. Context Always Has TenantId
```typescript
// In tRPC middleware
export const tenantMiddleware = t.middleware(async ({ ctx, next }) => {
  if (!ctx.tenantId) throw new TRPCError({ code: 'UNAUTHORIZED' });
  return next({ ctx: { ...ctx, tenantId: ctx.tenantId } });
});
```

## Red Flags - STOP Immediately
| Thought | Reality |
|---------|---------|
| "This is just a read, no tenant needed" | Reads leak data too |
| "I'll add tenant filter later" | Later never comes |
| "Admin can see all tenants" | Admin still queries with explicit tenantId |
| "Internal API, no user input" | Bugs happen, defense in depth |

## Verification
Run adversarial test: `pnpm test:adversarial` — 1000 concurrent queries, 2 tenants, **zero** cross-tenant results.

## Related
- ADR-0002: App-layer Tenant Isolation
- `server/shared/tenant.ts` — Helper functions
- `tests/adversarial/tenant-leakage.test.ts`