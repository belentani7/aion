# AION Unified — AGENTS.md (Project Rules)

**Version:** 2.0.0
**Status:** Active
**Last Updated:** 2026-10-19

---

## Stack & Versions (Pinned)

| Layer | Technology | Version | Notes |
|-------|------------|---------|-------|
| Runtime | Node.js | 22 LTS | `.nvmrc` enforced |
| Package Manager | pnpm | 10.34.7 | `corepack enable pnpm` |
| Frontend | React | 19.2.1 | Vite 7, Tailwind 4 |
| Backend | Express | 5.3.0 | tRPC 11 |
| ORM | Drizzle ORM | 0.45.2 | MySQL 8.4 / TiDB |
| Validation | Zod | 4.1.12 | tRPC integration |
| Auth | jose (JWT) | 6.1.0 | RS256, JWKS rotation |
| Payments | Stripe | 22.5.0 | Checkout + Webhooks |
| Compliance | Python | 3.12 | FastAPI, separate container |
| i18n | Custom | — | 10 langs, FormatJS-based |
| Testing | Vitest + Playwright | Latest | Testcontainers MySQL |
| Container | Docker | Multi-stage | Node 22 Alpine |
| Deploy | Cloud Run / GKE | — | GCP EU regions |

---

## Project Structure

```
aion-unified/
├── client/                 # React SPA
│   ├── src/
│   │   ├── _core/          # Auth hooks, core utilities
│   │   ├── components/     # shadcn/ui + custom
│   │   ├── contexts/       # I18n, Theme
│   │   ├── hooks/          # Custom hooks
│   │   ├── lib/            # trpc, utils, auditDisplay
│   │   ├── pages/          # Route components
│   │   ├── App.tsx, main.tsx, i18n.ts
│   └── public/
├── server/                 # Express + tRPC
│   ├── _core/              # Kernel: auth, context, db, llm, sdk
│   ├── modules/            # Domain modules (see ADR-0001)
│   │   ├── auth/
│   │   ├── tenant/
│   │   ├── shift/
│   │   ├── payroll/
│   │   ├── audit/
│   │   ├── compliance/
│   │   ├── pvcu/
│   │   ├── billing/
│   │   ├── incident/
│   │   ├── absence/
│   │   ├── agreement/
│   │   └── open-data/
│   ├── shared/             # Types, errors, utils
│   └── app.ts              # Composition root
├── services/compliance/    # Python FastAPI service
├── shared/                 # Cross-cutting types
├── drizzle/                # Migrations (MySQL)
├── docs/                   # PRD, SRS, SDD, ADRs, Plans, Rules
└── tests/                  # Unit, Integration, E2E, Adversarial
```

---

## Development Rules (Mandatory)

### 1. Spec-First Development (SDD)
- **No code without approved spec** — PRD → SRS → SDD → ADR → Plan → Rules → Code
- Reference: `docs/prd/PRD-AION-UNIFIED.md`, `docs/srs/SRS-AION-UNIFIED.md`, `docs/design/SDD-AION-UNIFIED.md`
- Every feature traces to FR-XXX/NFR-XXX with GWT criteria

### 2. Test-Driven Development (TDD)
- **Red-Green-Refactor** for every change
- Write failing test FIRST (`pnpm test` must fail before implementation)
- Unit tests: `tests/unit/`
- Integration tests: `tests/integration/` (Testcontainers MySQL)
- E2E tests: `tests/e2e/` (Playwright)
- Adversarial tests: `tests/adversarial/`

### 3. TypeScript Strict Mode
- `strict: true` in tsconfig.json — no exceptions
- No `any`, no `@ts-ignore` without ADR justification
- Types shared via `shared/` package
- tRPC provides end-to-end type safety

### 4. Tenant Isolation (Critical)
- **Every query MUST filter by `tenantId`** — No exceptions
- Use `withTenant(ctx, query)` helper
- Defensive joins: `ON a.id = b.id AND a.tenant_id = b.tenant_id`
- ESLint rule: `no-tenant-less-query` (custom)
- Adversarial test runs in CI: 1000 queries, 0 leakage

### 5. Audit Trail Integrity
- All mutations log to `audit_event` with hash chain
- Hash computation: `SHA256(prevHash | payloadHash | sequence)` — **deterministic**
- Public verification endpoint: `GET /api/audit/verify`
- Tampering detection tested in CI

### 6. Git Workflow
- **Conventional Commits**: `feat(scope):`, `fix(scope):`, `refactor(scope):`, `test(scope):`, `docs(scope):`, `chore(scope):`
- Branch naming: `feature/FR-XXX-description`, `fix/FR-XXX-description`
- PRs target `main`, require: CI green, 1 approval, no conflicts
- Squash merge, delete branch

### 7. Code Style
- ESLint (strict) + Prettier — `pnpm check` must pass
- `pnpm format` before commit
- Import order: external → internal → relative
- Barrel exports for modules (`index.ts`)

### 8. Error Handling
- **Never throw raw errors** — Use `AppError` subclasses with codes
- tRPC error formatter maps to user-friendly messages
- Structured logging with `correlationId`, **no PII in logs**
- PII redaction middleware on all loggers

### 9. Internationalization
- All visible strings in `client/src/locales/{lang}.json`
- **No hardcoded strings** in M/S priority features
- Contract test validates: `pnpm test:i18n`
- RTL (Arabic): `document.dir = 'rtl'`, CSS logical properties
- Regional formatting: `formatDate()`, `formatCurrency()` from i18n.ts

### 10. Security
- JWT: RS256, 15min access, 7d refresh, HttpOnly cookies
- Rate limiting: 10/min audit, 60/min auth, 100/min webhook
- Stripe: Signature verification, idempotency keys, timestamp tolerance
- Dependencies: `pnpm audit` in CI, no critical/high
- SAST: GitHub CodeQL in CI

---

## Commands

```bash
# Development
pnpm dev              # Start dev server (tsx watch)
pnpm build            # Production build (Vite + esbuild)
pnpm start            # Run production build

# Database
pnpm db:generate      # Generate migrations
pnpm db:migrate       # Run migrations
pnpm db:push          # Generate + migrate
pnpm db:seed          # Seed test data

# Quality
pnpm check            # TypeScript + ESLint
pnpm format           # Prettier write
pnpm test             # All tests (unit + integration)
pnpm test:unit        # Unit only
pnpm test:integration # Integration only (Testcontainers)
pnpm test:e2e         # Playwright E2E
pnpm test:adversarial # Multi-tenant, tampering, plan bypass
pnpm test:a11y        # Accessibility (axe-core)
pnpm test:i18n        # i18n contract (10 langs)

# Dependency Audit (ADR-0012)
pnpm audit --omit=dev --audit-level=high    # Production gate (MUST PASS)
pnpm audit --audit-level=high               # Dev audit (exceptions documented)
./scripts/audit-deps.sh                     # Local audit script (same as CI)

# Docker
docker compose up --build     # Local stack
docker compose down -v        # Clean shutdown

# Compliance Engine (separate)
cd services/compliance
python -m pytest test_agent.py
```

---

## Environment Variables (`.env`)

```bash
# Required
DATABASE_URL=mysql://user:pass@host:3306/db
JWT_SECRET=...                    # 256-bit base64
JWT_PUBLIC_KEY=...                # RS256 public (JWKS)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_FREE=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_ENTERPRISE=price_...

# Optional
NODE_ENV=development|production
PORT=3000
LOG_LEVEL=debug|info|warn|error
COMPLIANCE_URL=http://localhost:8000
OPENAI_API_KEY=...                # For PVC-U semantic checks
SENTRY_DSN=...                    # Error tracking
OTEL_EXPORTER_OTLP_ENDPOINT=...   # Observability
```

---

## Module Boundaries (ADR-0001)

```
server/modules/
├── auth/           # Authentication, sessions, JWT
├── tenant/         # Multi-tenancy, membership, RBAC
├── shift/          # Shifts, calendar, conflicts, agreements
├── payroll/        # Calculation, agreements, export, periods
├── audit/          # Hash chain, verification, export
├── compliance/     # Python client, rules, checks
├── pvcu/           # AI validation, risk, policies, evidence
├── billing/        # Stripe, plans, limits, webhooks
├── incident/       # Incidents, resolution
├── absence/        # Absences, approval, payroll integration
├── agreement/      # Collective agreements versioning
└── open-data/      # Weather, provenance
```

**Rules:**
- Modules communicate ONLY via tRPC procedures or shared kernel
- No direct imports between modules (except `shared/`)
- Each module has its own router, types, tests
- Shared kernel: `server/shared/` (errors, utils, db client)

---

## Definition of Ready (Story)

- [ ] FR-XXX referenced in SRS
- [ ] GWT criteria defined (M/S priority)
- [ ] Dependencies identified
- [ ] UI mockup (if UI change) — Visual Companion
- [ ] Acceptance threshold clear

## Definition of Done (Task)

- [ ] Implementation complete
- [ ] Unit tests pass (new + existing)
- [ ] Integration tests pass (if DB/API)
- [ ] TypeScript strict passes
- [ ] ESLint/Prettier pass
- [ ] Traceability updated (FR → Test)
- [ ] Documentation updated (if API change)
- [ ] No console.log, no debug code
- [ ] Reviewed by peer

---

## ADR Reference (Quick)

| ADR | Topic | Key Decision |
|-----|-------|--------------|
| 0001 | Architecture | Modular monolith, module boundaries |
| 0002 | Tenancy | App-layer isolation, defensive joins |
| 0003 | Audit | SHA-256 hash chain, deterministic, public verify |
| 0004 | API | tRPC v11, type-safe, React Query |
| 0005 | Compliance | Python FastAPI separate service |
| 0006 | PVC-U | Async validation, L0-L8, degradation policies |
| 0007 | Billing | Stripe Checkout, idempotency, plan matrix |
| 0008 | i18n | 10 langs, RTL, FormatJS-based custom |
| 0009 | Observability | OTel + structured logging (phased) |
| 0010 | Testing | Vitest, Playwright, Testcontainers, TDD |
| 0011 | Deploy | Docker multi-stage, Cloud Run/GKE, TiDB Cloud EU |
| 0012 | Dependencies | Universal overrides + documented exceptions |
| 0012 | Dependencies | Universal overrides + documented exceptions |

---

## Quick Reference: Critical Files

| File | Purpose |
|------|---------|
| `docs/prd/PRD-AION-UNIFIED.md` | Product requirements |
| `docs/srs/SRS-AION-UNIFIED.md` | Formal requirements (FR/NFR) |
| `docs/design/SDD-AION-UNIFIED.md` | Technical design |
| `docs/adr/ADR-*.md` | Architecture decisions |
| `docs/plans/PLAN-AION-UNIFIED.md` | Implementation plan |
| `server/modules/*/router.ts` | tRPC procedures |
| `server/shared/errors.ts` | AppError classes |
| `client/src/i18n.ts` | i18n core |
| `tests/adversarial/tenant-leakage.test.ts` | Isolation test |
| `tests/adversarial/hash-tampering.test.ts` | Audit test |
| `scripts/audit-deps.sh` | Local dependency audit (ADR-0012) |

---

## Superpowers Integration

This project uses **Superpowers** methodology:
- **Brainstorming** before any new feature
- **Systematic Debugging** for all issues
- **TDD** for all implementation
- **Subagent-Driven Development** for parallel work
- **Verification Before Completion** — evidence before claims

Invoke skills before acting:
```
"Let's add X" → superpowers:brainstorming
"Fix this bug" → superpowers:systematic-debugging
"Implement FR-XXX" → superpowers:test-driven-development
```

---

## Contact & Escalation

- **Tech Lead**: Pedro Belentani
- **Architecture Decisions**: Document in ADR, review with team
- **Security Issues**: Immediate escalation, document in audit trail
- **Production Incidents**: Follow runbook in `docs/runbooks/`

---

**Remember:** The documents are the source of truth. Code implements the spec. Tests verify the code. Evidence proves it works.