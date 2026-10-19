# ADR-0002: Application-Layer Tenant Isolation (Replacing PostgreSQL RLS)

## Status
Accepted (2026-10-19, Pedro Belentani)

## Context

The managed database is MySQL 8.4 / TiDB, which does **not** support Row-Level Security (RLS) like PostgreSQL. Previous design assumed PostgreSQL RLS for tenant isolation. We must implement equivalent isolation at the application layer.

Options considered:
1. **Application-layer filters** — Every query includes `tenant_id` in WHERE/JOIN, enforced by middleware
2. **Database views per tenant** — Create view per tenant with `WHERE tenant_id = ?`, query views
3. **Separate databases per tenant** — Schema per tenant, connection pool per tenant
4. **Separate database instances per tenant** — Full isolation, high cost

## Decision

**We will implement application-layer tenant isolation with defensive joins and mandatory tenant_id filters.**

### Implementation Requirements

1. **Middleware** — `tenant-context.ts` extracts `tenantId` from JWT, attaches to tRPC context
2. **Query Builder Wrapper** — Drizzle queries MUST use `.where(eq(table.tenantId, ctx.tenantId))` on every table
3. **Defensive Joins** — All joins include `tenant_id` on both sides:
   ```sql
   SELECT * FROM shift s
   JOIN employee e ON s.employee_id = e.id AND s.tenant_id = e.tenant_id
   WHERE s.tenant_id = ?
   ```
4. **Schema Constraint** — Every tenant-scoped table has `tenant_id CHAR(26) NOT NULL` + composite indexes
5. **Runtime Assertion** — Development mode: assert every SELECT/UPDATE/DELETE has tenant filter
6. **Test Verification** — Automated test: 2 tenants, 1000 concurrent queries, zero cross-tenant results

### Code Pattern (Enforced by ESLint Rule)

```typescript
// FORBIDDEN: query without tenant filter
const shifts = await db.select().from(shiftTable);

// REQUIRED: explicit tenant filter
const shifts = await db.select()
  .from(shiftTable)
  .where(eq(shiftTable.tenantId, ctx.tenantId));
```

### Migration from Previous Design

- Remove PostgreSQL RLS policies from migrations
- Add `tenant_id` to all tables (already present in MySQL schema)
- Add composite indexes: `(tenant_id, ...)` for all query patterns
- Update all routers to use `ctx.tenantId` from middleware

---

## Consequences

### Positive
- **Works on MySQL/TiDB**: No PostgreSQL-specific features required
- **Explicit & Auditable**: Every query shows tenant filter in code review
- **Testable**: Can verify isolation with automated tests
- **Performance**: Composite indexes optimize tenant-scoped queries
- **Portable**: Works on any SQL database

### Negative
- **Developer Discipline Required**: Easy to forget filter (mitigated: ESLint rule, code review, tests)
- **Boilerplate**: Every query needs explicit filter (mitigated: query helper `withTenant(ctx, query)`)
- **Migration Risk**: Existing queries must be audited (mitigated: automated audit script)

### Risks Mitigated
- **SQL Injection via tenantId**: `tenantId` comes from validated JWT, not user input
- **Cross-tenant via JOIN**: Defensive joins prevent accidental leakage
- **Admin bypass**: Owner role still requires tenantId, but can query any tenant via admin router with explicit tenantId param

---

## Related ADRs
- ADR-0001: Modular Monolith (defines module boundaries for isolation)
- ADR-0003: Hash Chain (audit events also tenant-scoped)

---

## Changelog
| Date | Author | Change |
|------|--------|--------|
| 2026-10-19 | Pedro Belentani | Initial decision |