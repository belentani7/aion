# SDD: AION Unified — Software Design Document

**Version:** 2.0.0
**Status:** Draft
**Based on:** SRS-AION-UNIFIED.md
**Date:** 2026-10-19

---

## 1. Existing Codebase Analysis

### Current Architecture (from code inspection)

```
aion-unified/
├── client/                      # React 19 + Vite 7 + Tailwind 4 + shadcn/ui
│   ├── src/
│   │   ├── _core/hooks/useAuth.ts
│   │   ├── components/          # 50+ shadcn/ui components
│   │   ├── contexts/            # I18nContext, ThemeContext
│   │   ├── hooks/               # useComposition, useMobile, usePersistFn
│   │   ├── lib/                 # auditDisplay, trpc, utils
│   │   ├── pages/               # Home, ComponentShowcase, ValidationCenter, NotFound
│   │   ├── App.tsx, main.tsx, i18n.ts (76KB), index.css
│   └── public/                  # landing.html, __manus__/debug-collector.js
├── server/                      # Express 5 + tRPC 11 + Drizzle ORM
│   ├── _core/                   # Auth, SDK, heartbeat, OAuth, storage, LLM, map, notifications
│   │   ├── context.ts, cookies.ts, dataApi.ts, env.ts, heartbeat.ts
│   │   ├── imageGeneration.ts, index.ts (15KB), llm.ts (10KB), map.ts
│   │   ├── notification.ts, oauth.ts, sdk.ts (10KB), storageProxy.ts
│   │   ├── systemRouter.ts, trpc.ts, vite.ts, voiceTranscription.ts
│   │   └── types/               # cookie.d.ts, manusTypes.ts
│   ├── aion/                    # AI Agent Core
│   │   ├── modelRouter.ts, router.ts, safeExecutor.ts, service.ts (7KB), store.ts
│   ├── pvcu*.ts                 # PVC-U Validation (IA + agents)
│   ├── stripe*.ts               # Billing (Checkout, webhooks)
│   ├── ledger.service.ts        # Immutable audit trail (SHA-256 hash chain)
│   ├── tenant-context.ts        # Multi-tenancy + RBAC
│   ├── payroll-policy.ts        # Payroll calc + collective agreements
│   ├── plan-policy.ts           # Plan enforcement (free/pro/enterprise)
│   ├── routers.ts (54KB)        # Main tRPC routers
│   ├── scheduler.ts, seed.ts, storage.ts
│   └── *.test.ts                # Unit tests (auth, i18n, ledger, payroll, plans, PVC-U, Stripe, tenant)
├── shared/                      # Types & constants
├── services/compliance/         # Python 3.12 compliance engine
│   ├── agent.py (21KB), api.py (7KB), schema.sql, test_agent.py (17KB)
│   └── Dockerfile, requirements.txt
├── drizzle/                     # Migrations (MySQL + PostgreSQL)
├── audit-evidence/              # ISO 23000 evidence, GitHub corpus
├── presentation-{pt,es,en}/     # Product slides (8 per language)
├── magic/                       # Interactive demos (shader, sfx, lore)
├── docs/AION-ARCHITECTURE.md    # Architecture blueprint
├── Dockerfile, docker-compose.yml
└── package.json (pnpm workspace)
```

### Key Integration Points Identified

| Component | Current State | Issues |
|-----------|---------------|--------|
| **Tenant Resolution** | `limit(1)` in routers.ts | No user-tenant association, returns first tenant |
| **Hash Chain** | `Date.now()` in computeHash | Non-deterministic, verification doesn't recompute |
| **Audit Endpoint** | Missing `/api/audit/verify` | Only tRPC, no public REST |
| **OAuth Sync** | Inserts membership without tenantId | Fails on new tenant creation |
| **RLS** | PostgreSQL migrations exist | Managed DB is MySQL/TiDB — RLS not supported |
| **Plan Enforcement** | Partial in plan-policy.ts | Matrix incomplete, missing capability checks |
| **Employee History** | Limited to 3 items | No cursor pagination implemented |
| **Stripe Webhook** | Implemented with idempotency | Sandbox integration not validated |
| **i18n** | 10 languages, 34 tests pass | Some dynamic labels not extracted |
| **Compliance Engine** | Python service, Dockerized | Not integrated in CI, no contract tests |

---

## 2. Technical Approach

### Architecture Pattern: **Modular Monolith with Service Extraction**

- **Core**: Single Node.js process (Express + tRPC) for latency-sensitive paths
- **Extracted Service**: Python compliance engine (separate container, gRPC/REST)
- **Future Extraction**: PVC-U validation could become separate service
- **Rationale**: MVP velocity, operational simplicity, clear extraction boundaries

### Stack Versions (Explicit)

| Layer | Technology | Version | Rationale |
|-------|------------|---------|-----------|
| Runtime | Node.js | 22 LTS | Active LTS, native test runner |
| Package Manager | pnpm | 10.34.7 | Workspace support, fast installs |
| Frontend | React | 19.2.1 | Latest stable, concurrent features |
| Build | Vite | 7.3.7 | Fast HMR, optimized builds |
| Styling | Tailwind CSS | 4.1.14 | Utility-first, OKLCH colors |
| UI Components | shadcn/ui + Radix | Latest | Accessible, customizable |
| State/Query | TanStack Query | 5.90.2 | Server state management |
| Routing | Wouter | 3.3.5 | Lightweight, no router bloat |
| Backend | Express | 5.3.0 | Standard, middleware ecosystem |
| API | tRPC | 11.18.0 | Type-safe, no codegen |
| ORM | Drizzle ORM | 0.45.2 | Type-safe, fast, MySQL/PostgreSQL |
| Validation | Zod | 4.1.12 | Schema validation, tRPC integration |
| Auth | jose (JWT) | 6.1.0 | Standard, edge-compatible |
| Payments | Stripe | 22.5.0 | Latest API |
| Database | MySQL | 8.4 | Managed, TiDB compatible |
| Compliance | Python | 3.12 | Type hints, performance |
| Container | Docker | Multi-stage | Build → prod separation |

### Dependencies & Implementation Constraints (Order Mandatory)

1. **Foundation** → Auth, Tenancy, Audit Trail (hash chain), Database schema
2. **Core Domain** → Shifts, Employees, Departments, Payroll Calculation
3. **Integrations** → Stripe, Compliance Engine, PVC-U
4. **Advanced** → Plan Enforcement, Evidence Export, Self-Validation
5. **Quality** → Tests, Accessibility, Performance, Security hardening

---

## 3. Contracts & Interfaces

### tRPC Router Structure (from routers.ts analysis)

```typescript
// Main app router
appRouter = {
  auth: authRouter,           // register, login, me, refresh
  shift: shiftRouter,         // CRUD, calendar, conflicts, assignments
  employee: employeeRouter,   // CRUD, history (paginated), incidents
  department: departmentRouter,
  payroll: payrollRouter,     // calculate, records, export, periods
  audit: auditRouter,         // query, verify (tRPC), evidence export
  compliance: complianceRouter, // check, rules
  pvcu: pvcuRouter,           // validate, policies, evidence
  plan: planRouter,           // limits, usage, enforcement
  incident: incidentRouter,   // CRUD, resolution
  absence: absenceRouter,     // CRUD, approval, payroll integration
  agreement: agreementRouter, // versioned collective agreements
  openData: openDataRouter,   // weather, provenance
  admin: adminRouter,         // tenant management (owner only)
}
```

### REST Endpoint (Public)

```
GET /api/audit/verify
  Query: tenantId, chainId (optional), fromIndex, toIndex
  Response: { valid: boolean, proof: HashProof[], mismatchAt?: number }
  Rate Limit: 10 req/min/IP
  Auth: None (public verification)
```

### Database Schema (Drizzle — MySQL)

```sql
-- Core tables with tenant isolation
CREATE TABLE tenant (
  id CHAR(26) PRIMARY KEY,  -- nanoid
  name VARCHAR(255) NOT NULL,
  plan ENUM('free','pro','enterprise') DEFAULT 'free',
  stripe_customer_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE membership (
  id CHAR(26) PRIMARY KEY,
  tenant_id CHAR(26) NOT NULL,
  user_id CHAR(26) NOT NULL,
  role ENUM('owner','admin','manager','employee') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_tenant_user (tenant_id, user_id),
  FOREIGN KEY (tenant_id) REFERENCES tenant(id)
);

CREATE TABLE employee (
  id CHAR(26) PRIMARY KEY,
  tenant_id CHAR(26) NOT NULL,
  user_id CHAR(26),  -- nullable for non-user employees
  department_id CHAR(26),
  first_name VARCHAR(100), last_name VARCHAR(100),
  email VARCHAR(255), phone VARCHAR(50),
  hire_date DATE, status ENUM('active','inactive','terminated'),
  FOREIGN KEY (tenant_id) REFERENCES tenant(id),
  FOREIGN KEY (department_id) REFERENCES department(id),
  INDEX idx_tenant_status (tenant_id, status)
);

CREATE TABLE shift (
  id CHAR(26) PRIMARY KEY,
  tenant_id CHAR(26) NOT NULL,
  employee_id CHAR(26) NOT NULL,
  department_id CHAR(26),
  start_at DATETIME NOT NULL, end_at DATETIME NOT NULL,
  status ENUM('scheduled','confirmed','cancelled','completed'),
  notes TEXT,
  FOREIGN KEY (tenant_id) REFERENCES tenant(id),
  FOREIGN KEY (employee_id) REFERENCES employee(id),
  INDEX idx_tenant_employee_date (tenant_id, employee_id, start_at)
);

CREATE TABLE audit_event (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id CHAR(26) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  payload_hash CHAR(64) NOT NULL,
  prev_hash CHAR(64) NOT NULL,
  current_hash CHAR(64) NOT NULL,
  actor_id CHAR(26),
  created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6),
  INDEX idx_tenant_created (tenant_id, created_at),
  INDEX idx_chain (tenant_id, current_hash)
);

CREATE TABLE pvcu_validation (
  id CHAR(26) PRIMARY KEY,
  tenant_id CHAR(26) NOT NULL,
  request_hash CHAR(64) NOT NULL,
  response_hash CHAR(64),
  risk_level TINYINT UNSIGNED NOT NULL,  -- 0-8
  policy_applied VARCHAR(100),
  evidence_hash CHAR(64),
  created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6),
  FOREIGN KEY (tenant_id) REFERENCES tenant(id)
);
```

### Data Flow: Shift → Payroll → Audit

```
1. Manager creates shift (tRPC: shift.create)
   ├─ Validates against collective agreement (payroll-policy)
   ├─ Checks coverage conflicts
   └─ Records audit_event (SHIFT_CREATED)

2. Shift completed (tRPC: shift.complete)
   ├─ Records audit_event (SHIFT_COMPLETED)
   └─ Triggers payroll recalculation (async)

3. Payroll period close (tRPC: payroll.calculatePeriod)
   ├─ Aggregates shifts per employee
   ├─ Applies agreement rules (overtime, night, holiday, supplements)
   ├─ Creates payroll_record with SHA-256 hash
   ├─ Records audit_event (PAYROLL_CALCULATED) with record hash
   └─ Updates ledger hash chain

4. External verification (GET /api/audit/verify)
   ├─ Reads audit_event chain for tenant
   ├─ Recomputes hashes from genesis
   ├─ Returns valid/invalid with proof
```

---

## 4. Acceptance Criteria per Component (Verifiable)

| Component | Criterion | Threshold |
|-----------|-----------|-----------|
| **Auth** | Registration creates tenant + owner membership | 100% success in integration test |
| **Auth** | JWT contains tenantId, role, exp; validated on each request | 0 auth bypasses in adversarial test |
| **Tenancy** | Zero data leakage between 2 tenants | 1000 concurrent queries, 0 cross-tenant results |
| **Shifts** | Conflict detection returns ET/CT/WH/EU article refs | 100% of test cases match manual review |
| **Payroll** | CSV export matches manual calculation for 50 shifts | 0 discrepancies |
| **Audit** | Hash chain verification detects single-bit tampering | 100% detection rate |
| **Audit REST** | Public endpoint returns valid proof for clean chain | 100% success |
| **Audit REST** | Public endpoint detects tampering at correct index | 100% accuracy |
| **Compliance** | Python engine detects known violations in test corpus | >95% recall, >90% precision |
| **PVC-U** | Risk classification L0-L8 matches test fixtures | 100% fixture match |
| **PVC-U** | Degradation policy applied for L5+ | 100% policy execution |
| **Stripe** | Webhook idempotency handles 10 duplicate events | 0 double-charges |
| **Stripe** | Plan limits enforced immediately after upgrade | <1s propagation |
| **i18n** | 10 languages, 100% visible strings localized | 0 hardcoded strings in M/S features |
| **i18n** | RTL (Arabic) renders correctly | Visual regression pass |
| **History** | Cursor pagination returns 50 items per page | No 3-item limit, correct cursor |
| **Incidents** | CRUD + resolution workflow with tenant isolation | 100% isolation in tests |

---

## 5. Verification Strategy

### Test Pyramid

| Level | Tools | Coverage Target | When |
|-------|-------|-----------------|------|
| **Unit** | Vitest | 80%+ backend, 70%+ frontend | Every commit (pre-commit hook) |
| **Integration** | Vitest + Testcontainers (MySQL) | All routers, DB operations | CI pipeline |
| **E2E** | Playwright | Critical flows (5 scenarios) | CI pipeline, pre-release |
| **Adversarial** | Custom scripts | Multi-tenant leakage, tampering | CI pipeline, weekly |
| **Contract** | Pact / custom | tRPC client-server, Python API | CI pipeline |
| **Accessibility** | axe-core + Vitest | WCAG 2.1 AA | CI pipeline |
| **Performance** | k6 / custom | P95 < 200ms, PVC-U < 500ms | Weekly, pre-release |

### First Verification Point (Phase 1 Complete)

- [ ] `pnpm test` passes (all unit tests)
- [ ] `pnpm check` passes (TypeScript strict)
- [ ] Docker compose up → seed → query audit chain → valid
- [ ] Two-tenant isolation test passes
- [ ] Hash chain recomputation matches stored values

---

## 6. Architecture & Data Flow Diagrams

### C4 Level 1: System Context

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│   Employee  │────▶│                  │◀───│  HR Manager │
│  (Mobile)   │     │   AION Unified   │     │  (Desktop)  │
└─────────────┘     │   (SaaS Platform)│     └─────────────┘
                    │                  │
┌─────────────┐     │  ┌────────────┐  │     ┌─────────────┐
│ Compliance  │────▶│  │  Compliance │  │◀───│  Payroll    │
│  Officer    │     │  │   Engine    │  │     │   Admin     │
└─────────────┘     │  │  (Python)   │  │     └─────────────┘
                    │  └────────────┘  │
┌─────────────┐     │  ┌────────────┐  │     ┌─────────────┐
│   Auditor   │────▶│  │   Audit    │  │◀───│   Stripe    │
│  (External) │     │  │ Verification│  │     │  (Payments) │
└─────────────┘     │  │  (Public)  │  │     └─────────────┘
                    │  └────────────┘  │
┌─────────────┐     │  ┌────────────┐  │     ┌─────────────┐
│  AI Agent   │────▶│  │   PVC-U    │  │     │  Open Data  │
│  (Internal) │     │  │ Validation │  │     │  (Weather)  │
└─────────────┘     │  └────────────┘  │     └─────────────┘
                    └──────────────────┘
```

### C4 Level 2: Container Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      AION Unified                            │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │   Client     │  │   Server     │  │  Compliance Engine │  │
│  │  (React SPA) │  │ (Express+tRPC)│  │    (Python/FastAPI)│  │
│  └──────┬───────┘  └──────┬───────┘  └─────────┬──────────┘  │
│         │                 │                      │             │
│         │    tRPC/HTTP    │                      │             │
│         ▼                 ▼                      │             │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │              Shared Database (MySQL/TiDB)                 │ │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌────────────────┐  │ │
│  │  │ Tenant  │ │ Employee│ │  Shift  │ │  Audit Event   │  │ │
│  │  │         │ │         │ │         │ │  (Hash Chain)  │  │ │
│  │  └─────────┘ └─────────┘ └─────────┘ └────────────────┘  │ │
│  └──────────────────────────────────────────────────────────┘ │
│         │                 │                      │             │
│         │                 ▼                      │             │
│         │         ┌──────────────┐               │             │
│         └────────▶│    Stripe    │               │             │
│                   │  (Checkout,  │               │             │
│                   │   Webhooks)  │               │             │
│                   └──────────────┘               │             │
│                                                  │             │
│         ┌────────────────────────────────────────┘             │
│         ▼                                                      │
│  ┌──────────────┐                                             │
│  │   PVC-U      │                                             │
│  │ Validation   │◀─── Internal AI Agents                       │
│  └──────────────┘                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Security Design

### Threat Model (STRIDE)

| Threat | Mitigation | Verification |
|--------|------------|--------------|
| **Spoofing** | JWT with short expiry, refresh rotation, secure cookies | Auth bypass tests |
| **Tampering** | SHA-256 hash chain, timing-safe compare, CSP headers | Tampering detection tests |
| **Repudiation** | Immutable audit trail, hash chain, public verification | Non-repudiation proof |
| **Info Disclosure** | Tenant isolation (app-layer RLS), PII redaction in logs | Multi-tenant leakage tests |
| **DoS** | Rate limiting (public endpoints), query complexity limits | Load tests |
| **Elevation** | RBAC on all tRPC procedures, plan enforcement | Authorization matrix tests |

### Crypto Choices

- **Hash**: SHA-256 (FIPS 180-4, widely supported, sufficient for audit trail)
- **JWT**: RS256 (asymmetric, key rotation via JWKS)
- **Passwords**: Argon2id (via bcryptjs or native)
- **TLS**: Terminated at load balancer, mTLS for service-to-service (future)

---

## 8. Operational Design

### Observability

| Signal | Implementation |
|--------|----------------|
| **Logs** | Structured JSON, correlationId per request, PII redacted |
| **Metrics** | Prometheus format: request latency, error rate, PVC-U latency/result, audit chain length |
| **Traces** | OpenTelemetry (future), correlationId propagation for now |
| **Alerts** | Audit verification failures, tenant leakage, Stripe webhook failures, PVC-U high-risk spikes |

### Deployment

- **Local**: `docker compose up --build` (MySQL + App + Compliance)
- **Staging**: Managed MySQL (TiDB Cloud), Container (Cloud Run/GKE), Compliance separate
- **Production**: Same as staging, multi-region for EU data residency
- **Migrations**: `drizzle-kit migrate` on deploy, idempotent, backwards-compatible

### Backup & Recovery

- **RPO**: < 1 hour (managed DB point-in-time recovery)
- **RTO**: < 30 min (container restart + migration)
- **Audit Trail**: Never deleted, append-only, exportable

---

## 9. Risks & Mitigations (Technical)

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| MySQL managed doesn't support RLS | Certain | High | App-layer isolation with defensive joins + comprehensive tests |
| OAuth sync fails on new tenant | High | High | Fix sync flow, add integration test with fresh tenant |
| Hash chain non-deterministic (Date.now) | Certain | High | Replace with deterministic input (prevHash + payload + counter) |
| PVC-U latency spikes | Medium | Medium | Async validation, policy caching, circuit breaker |
| Stripe webhook duplicates | Medium | High | Event ID dedup table, idempotency key on Checkout Session |
| i18n RTL breaks complex layouts | Low | Medium | Automated visual regression (Chromatic/Playwright) |
| Collective agreement versioning conflicts | Medium | Medium | Explicit version field, migration scripts, audit trail |

---

## 10. Gate: SDD Approval

**Human approval required before proceeding to ADR/Plan.**

- [ ] Existing codebase analysis complete and accurate
- [ ] Technical approach justified (modular monolith)
- [ ] Stack versions explicit and current
- [ ] Implementation order respects dependencies
- [ ] Contracts/interfaces defined (tRPC, REST, DB)
- [ ] Acceptance criteria verifiable with thresholds
- [ ] Verification strategy defined with first verification point
- [ ] Architecture diagrams included (C4 Level 1 & 2)
- [ ] Security design covers STRIDE
- [ ] Operational design covers observability, deployment, backup
- [ ] Risks identified with mitigations

**Approved by:** ________________ **Date:** ________________