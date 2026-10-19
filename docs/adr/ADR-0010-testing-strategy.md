# ADR-0010: Testing Strategy — TDD with Vitest, Playwright, Testcontainers

## Status
Accepted (2026-10-19, Pedro Belentani)

## Context

AION needs a comprehensive testing strategy that ensures correctness, prevents regressions, and validates multi-tenant isolation, audit trail integrity, and compliance accuracy.

Options considered:
1. **Jest** — Mature, but ESM support historically painful
2. **Vitest** — Native ESM, Vite integration, fast, Jest-compatible API
3. **Playwright** — E2E, cross-browser, reliable
4. **Cypress** — E2E, but heavier, less flexible for multi-tab
5. **Testcontainers** — Real DB in tests, no mocks

## Decision

**We will use Vitest (unit/integration), Playwright (E2E), and Testcontainers (real MySQL) with TDD discipline.**

### Test Pyramid

| Level | Tool | Scope | Target | When |
|-------|------|-------|--------|------|
| **Unit** | Vitest | Pure functions, utils, policies | 80% backend, 70% frontend | Pre-commit, CI |
| **Integration** | Vitest + Testcontainers | tRPC routers, DB operations, middleware | 100% routers | CI |
| **Contract** | Vitest | tRPC client-server, Python API | All public procedures | CI |
| **E2E** | Playwright | Critical user flows | 5 scenarios | CI, pre-release |
| **Adversarial** | Custom | Multi-tenant leakage, tampering | 100% isolation | CI, weekly |
| **Accessibility** | axe-core + Vitest | WCAG 2.1 AA | All interactive components | CI |
| **Performance** | k6 | P95 latency, PVC-U | <200ms API, <500ms PVC-U | Weekly |

### TDD Discipline (Enforced)

1. **Red**: Write failing test first (unit or integration)
2. **Green**: Minimal implementation to pass
3. **Refactor**: Clean up, maintain tests
4. **No Implementation Without Test**: CI fails if new code lacks test

### Test Organization

```
tests/
├── unit/                      # Vitest, no DB
│   ├── payroll-policy.test.ts
│   ├── ledger-hash.test.ts
│   ├── pvcu-risk.test.ts
│   └── i18n.test.ts
├── integration/               # Vitest + Testcontainers (MySQL)
│   ├── auth.test.ts
│   ├── shift.test.ts
│   ├── payroll.test.ts
│   ├── audit.test.ts
│   ├── tenant-isolation.test.ts
│   ├── stripe-webhook.test.ts
│   └── compliance.test.ts
├── contract/                  # tRPC client-server, Python API
│   ├── trpc-contract.test.ts
│   └── compliance-api.test.ts
├── e2e/                       # Playwright
│   ├── signup-to-first-shift.spec.ts
│   ├── shift-to-payroll.spec.ts
│   ├── audit-verification.spec.ts
│   ├── plan-upgrade.spec.ts
│   └── multi-tenant-isolation.spec.ts
├── adversarial/               # Custom scripts
│   ├── tenant-leakage.test.ts
│   ├── hash-tampering.test.ts
│   └── plan-bypass.test.ts
└── accessibility/             # axe-core
    ├── dashboard.a11y.test.ts
    ├── dialogs.a11y.test.ts
    └── forms.a11y.test.ts
```

### Testcontainers Setup (MySQL)

```typescript
// tests/setup/testcontainers.ts
import { MySqlContainer } from '@testcontainers/mysql';
import { drizzle } from 'drizzle-orm/mysql2';
import { migrate } from 'drizzle-orm/mysql2/migrator';

export async function setupTestDb() {
  const container = await new MySqlContainer('mysql:8.4')
    .withDatabase('aion_test')
    .withUsername('test')
    .withPassword('test')
    .start();
  
  const db = drizzle(mysql2.createConnection({
    host: container.getHost(),
    port: container.getPort(),
    user: 'test',
    password: 'test',
    database: 'aion_test',
  }));
  
  await migrate(db, { migrationsFolder: './drizzle/migrations-mysql' });
  
  return { container, db, cleanup: () => container.stop() };
}
```

### Critical Test Scenarios

#### Multi-Tenant Isolation (Adversarial)
```typescript
test('Zero data leakage between tenants', async () => {
  const { db: dbA } = await createTenant('tenant-A');
  const { db: dbB } = await createTenant('tenant-B');
  
  await dbA.insert(shift).values({ tenantId: 'tenant-A', ... });
  await dbB.insert(shift).values({ tenantId: 'tenant-B', ... });
  
  const resultsA = await dbA.select().from(shift).where(eq(shift.tenantId, 'tenant-A'));
  const resultsB = await dbB.select().from(shift).where(eq(shift.tenantId, 'tenant-B'));
  
  // Cross-tenant queries must return empty
  const crossA = await dbA.select().from(shift).where(eq(shift.tenantId, 'tenant-B'));
  const crossB = await dbB.select().from(shift).where(eq(shift.tenantId, 'tenant-A'));
  
  expect(crossA).toHaveLength(0);
  expect(crossB).toHaveLength(0);
});
```

#### Hash Chain Tampering Detection
```typescript
test('Single-bit tampering detected at correct index', async () => {
  const chain = await createAuditChain(100);
  
  // Tamper event 42
  await db.update(auditEvent)
    .set({ payloadHash: corrupt(chain[42].payloadHash) })
    .where(eq(auditEvent.id, chain[42].id));
  
  const result = await verifyChain(chain[0].tenantId, 1, 100);
  
  expect(result.valid).toBe(false);
  expect(result.mismatchAt).toBe(42);
});
```

#### Plan Enforcement
```typescript
test('Free plan blocked from audit export', async () => {
  const freeTenant = await createTenant({ plan: 'free' });
  const proTenant = await createTenant({ plan: 'pro' });
  
  await expect(exportAudit(freeTenant)).rejects.toThrow(/upgrade/i);
  await expect(exportAudit(proTenant)).resolves.toBeDefined();
});
```

---

## Consequences

### Positive
- **Real DB**: Testcontainers = no mock surprises
- **Fast Feedback**: Vitest ~1s for unit, ~30s for integration
- **Type Safety**: Tests share types with implementation
- **CI Friendly**: Containers in GitHub Actions, no external deps
- **Comprehensive**: Covers unit → E2E → adversarial

### Negative
- **Testcontainers Overhead**: ~10s startup per test file (mitigated: shared container per suite)
- **Playwright Flakiness**: Browser tests can be flaky (mitigated: retries, stable selectors)
- **Maintenance**: Tests are code too (mitigated: TDD keeps them current)

---

## Related ADRs
- ADR-0001: Modular Monolith (test per module)
- ADR-0002: Tenant Isolation (adversarial tests)
- ADR-0003: Hash Chain (tampering tests)

---

## Changelog
| Date | Author | Change |
|------|--------|--------|
| 2026-10-19 | Pedro Belentani | Initial decision |