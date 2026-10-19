# ADR-0001: Modular Monolith Architecture for MVP

## Status
Accepted (2026-10-19, Pedro Belentani)

## Context

AION Unified needs to deliver a comprehensive workforce management SaaS with multiple domains (shifts, payroll, compliance, audit, AI validation, billing, multi-tenancy) on a tight timeline. The team is small (1-2 developers initially). We need to balance:

1. **Delivery velocity** — single deployable unit, shared database, no distributed system complexity
2. **Future extractability** — clear service boundaries for later extraction
3. **Operational simplicity** — one container, one database, minimal infrastructure
4. **Team autonomy** — but team is small, so module ownership within monolith

Options considered:
1. **Microservices from start** — 8+ services, distributed tracing, saga patterns, high operational burden
2. **Modular monolith** — single deploy, clear module boundaries, shared DB with tenant isolation, extractable later
3. **Serverless functions** — vendor lock-in, cold starts, debugging complexity, not suited for long-running compliance checks
4. **Monorepo with separate deployments** — similar to microservices but shared tooling

## Decision

**We will use a Modular Monolith architecture with explicit module boundaries and a shared MySQL database.**

### Module Boundaries (enforced by TypeScript path aliases and ESLint)

```
server/
├── modules/
│   ├── auth/              # Authentication, JWT, sessions
│   ├── tenant/            # Multi-tenancy, membership, RBAC
│   ├── shift/             # Shift CRUD, calendar, conflicts
│   ├── payroll/           # Calculation, agreements, export
│   ├── audit/             # Hash chain, verification, export
│   ├── compliance/        # Python engine client, rules
│   ├── pvcu/              # AI validation, risk, policies
│   ├── billing/           # Stripe, plans, limits
│   ├── incident/          # Incidents, resolution
│   ├── absence/           # Absences, approval
│   ├── agreement/         # Collective agreements versioning
│   └── open-data/         # Weather, provenance
├── shared/                # Kernel: types, errors, utils, db client
└── app.ts                 # Composition root, router assembly
```

### Extraction Criteria (when to extract a module)

A module MAY be extracted as a separate service WHEN:
- It has distinct scaling requirements (e.g., compliance engine CPU-intensive)
- It requires different technology stack (e.g., Python for compliance)
- Team grows beyond 5 developers needing independent deployments
- Clear SLA/SLO divergence from core

Current extraction candidates:
- **Compliance Engine** → Already separate Python service (Docker)
- **PVC-U Validation** → Candidate for future extraction (AI/ML workload)

---

## Consequences

### Positive
- **Fast delivery**: Single build, deploy, test cycle
- **Simple debugging**: All logs in one place, no distributed tracing needed yet
- **ACID transactions**: Cross-module operations (shift→payroll→audit) in single transaction
- **Type safety**: End-to-end TypeScript from DB to UI via tRPC
- **Clear extraction path**: Module boundaries defined from day one

### Negative
- **Scaling**: All modules scale together (mitigated: managed DB + container autoscaling)
- **Deployment coupling**: Bug in one module blocks deploy (mitigated: feature flags, staged rollouts)
- **Database contention**: Shared connection pool (mitigated: read replicas, connection pooling)
- **Technology lock-in**: Harder to use different languages (mitigated: compliance already extracted)

### Trade-offs Accepted
- No distributed transactions (use saga pattern only when extracted)
- No polyglot persistence (MySQL for all, compliance uses separate SQLite/PostgreSQL)
- No independent versioning (single version for all modules)

---

## Related ADRs
- ADR-0002: App-layer Tenant Isolation (replaces PostgreSQL RLS)
- ADR-0003: SHA-256 Hash Chain for Audit Trail
- ADR-0004: tRPC for Type-Safe API
- ADR-0005: Python Compliance Engine as Separate Service

---

## Changelog
| Date | Author | Change |
|------|--------|--------|
| 2026-10-19 | Pedro Belentani | Initial decision |