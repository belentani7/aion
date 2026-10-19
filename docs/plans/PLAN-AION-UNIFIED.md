# Implementation Plan: AION Unified

**Version:** 2.0.0
**Status:** Draft
**Based on:** SDD-AION-UNIFIED.md + ADRs
**Date:** 2026-10-19

---

## Phase Overview

| Phase | Focus | Duration | Dependencies |
|-------|-------|----------|--------------|
| **0** | Project Setup & Tooling | 1 day | — |
| **1** | Foundation (Auth, Tenancy, Audit, DB) | 5 days | Phase 0 |
| **2** | Core Domain (Shifts, Employees, Departments) | 5 days | Phase 1 |
| **3** | Payroll & Compliance | 5 days | Phase 2 |
| **4** | Integrations (Stripe, PVC-U, Open Data) | 5 days | Phase 2 |
| **5** | Advanced Features (Plans, Evidence, Exceptions) | 3 days | Phase 3, 4 |
| **6** | Quality Assurance (Tests, A11y, Perf, Security) | 5 days | Phase 1-5 |
| **7** | Documentation & Deployment | 2 days | Phase 6 |

**Total Estimated:** 31 days (6.5 weeks)

---

## Phase 0: Project Setup & Tooling (1 day)

| Task | Owner | Verify |
|------|-------|--------|
| 0.1 Initialize git repo with conventional commits | Dev | `git log --oneline` shows conventional |
| 0.2 Configure ESLint (strict), Prettier, Husky pre-commit | Dev | `pnpm check` passes |
| 0.3 Configure Vitest + Testcontainers + Playwright | Dev | `pnpm test` runs |
| 0.4 Setup Docker Compose (MySQL + App + Compliance) | Dev | `docker compose up` healthy |
| 0.5 Configure CI (GitHub Actions: check, test, build) | Dev | CI passes on PR |
| 0.6 Create AGENTS.md with project rules | Dev | File exists, referenced |

**Milestone:** Clean repo, CI green, local dev environment working.

---

## Phase 1: Foundation (5 days)

### 1.1 Database Schema & Migrations (1 day)
| Task | Owner | Verify |
|------|-------|--------|
| 1.1.1 Create MySQL schema (all tables with tenant_id) | Backend | `drizzle-kit generate` matches design |
| 1.1.2 Add composite indexes for tenant queries | Backend | `EXPLAIN` shows index usage |
| 1.1.3 Write idempotent migration scripts | Backend | `drizzle-kit migrate` re-runnable |
| 1.1.4 Seed script (1 tenant, 5 employees, 10 shifts) | Backend | `pnpm db:seed` creates data |

### 1.2 Auth & Tenancy (2 days)
| Task | Owner | Verify |
|------|-------|--------|
| 1.2.1 JWT auth (register, login, refresh, me) | Backend | Unit + integration tests pass |
| 1.2.2 Tenant middleware (extract tenantId from JWT) | Backend | Context has tenantId on all procedures |
| 1.2.3 RBAC middleware (owner/admin/manager/employee) | Backend | 403 on unauthorized roles |
| 1.2.4 Fix OAuth sync (include tenantId in membership) | Backend | New tenant OAuth creates membership |
| 1.2.5 **Adversarial test**: 2 tenants, 1000 queries, 0 leakage | QA | Test passes |

### 1.3 Audit Trail & Hash Chain (2 days)
| Task | Owner | Verify |
|------|-------|--------|
| 1.3.1 Deterministic hash chain (fix Date.now bug) | Backend | Recompute matches stored |
| 1.3.2 Ledger service (record, verify, export) | Backend | Unit tests: tampering detected at correct index |
| 1.3.3 Public REST endpoint `/api/audit/verify` | Backend | Returns valid proof, detects tampering |
| 1.3.4 Rate limiting (10 req/min/IP) | Backend | 11th request returns 429 |
| 1.3.5 Audit events for all domain actions | Backend | Every mutation logs event |

**Milestone:** Auth works, tenancy isolated, audit trail immutable, public verification works.

---

## Phase 2: Core Domain (5 days)

### 2.1 Shifts & Calendar (2 days)
| Task | Owner | Verify |
|------|-------|--------|
| 2.1.1 Shift CRUD (tRPC: create, read, update, delete) | Backend | CRUD tests pass |
| 2.1.2 Calendar views (week/month, filters) | Backend | Query returns correct filtered set |
| 2.1.3 Conflict detection (overlap, coverage gaps) | Backend | Returns violations with details |
| 2.1.4 Collective agreement validation (pre-shift) | Backend | Returns article refs (ET/CT/WH/EU) |
| 2.1.5 Shift assignment to employee/department | Backend | Assignment recorded, audit event |

### 2.2 Employees & Departments (1.5 days)
| Task | Owner | Verify |
|------|-------|--------|
| 2.2.1 Employee CRUD (multi-tenant) | Backend | CRUD tests pass |
| 2.2.2 Department CRUD + hierarchy | Backend | Hierarchy queries work |
| 2.2.3 **Employee history pagination (cursor-based)** | Backend | Returns 50/page, no 3-item limit |
| 2.2.4 Employee profile page (frontend) | Frontend | Shows history, payroll, incidents |

### 2.3 Incidents & Absences (1.5 days)
| Task | Owner | Verify |
|------|-------|--------|
| 2.3.1 Incident CRUD + resolution workflow | Backend | Status transitions enforced |
| 2.3.2 Absence CRUD + approval workflow | Backend | Approved/rejected states |
| 2.3.3 Incident/absence filters per employee | Backend | Tenant-isolated queries |
| 2.3.4 Frontend incident/absence UI | Frontend | Lists, forms, resolution |

**Milestone:** Full shift/employee/incident/absence CRUD with tenant isolation, calendar works, history paginated.

---

## Phase 3: Payroll & Compliance (5 days)

### 3.1 Payroll Calculation (2.5 days)
| Task | Owner | Verify |
|------|-------|--------|
| 3.1.1 Hours aggregation (regular, OT, night, holiday) | Backend | Matches manual calc for 50 shifts |
| 3.1.2 Collective agreement rules engine | Backend | Versioned agreements, v1/v2 both work |
| 3.1.3 Supplements (overnight, hazard, etc.) | Backend | Each supplement type tested |
| 3.1.4 Payroll record with SHA-256 hash | Backend | Hash links to audit chain |
| 3.1.5 CSV export (SEPA-compatible) | Backend | CSV imports cleanly in spreadsheet |
| 3.1.6 Absences integration (no double-count) | Backend | Approved absence = paid, not worked |

### 3.2 Compliance Engine Integration (2.5 days)
| Task | Owner | Verify |
|------|-------|--------|
| 3.2.1 Python FastAPI service (Docker) | Backend | `/health` returns 200 |
| 3.2.2 Compliance check endpoint (4 jurisdictions) | Backend | Returns violations with article refs |
| 3.2.3 Node.js client with circuit breaker | Backend | Timeout/fallback works |
| 3.2.4 Pre-shift compliance check (async) | Backend | Violations shown in UI before save |
| 3.2.5 Contract tests (Node ↔ Python) | QA | Pact/contract tests pass |
| 3.2.6 **Test corpus**: Known violations detected >95% | QA | Recall/precision measured |

**Milestone:** Payroll calculates correctly, compliance engine integrated, violations surfaced in UI.

---

## Phase 4: Integrations (5 days)

### 4.1 Stripe Billing (2 days)
| Task | Owner | Verify |
|------|-------|--------|
| 4.1.1 Checkout Session creation (metadata: tenantId) | Backend | Session created, redirect works |
| 4.1.2 Webhook handler (signature + idempotency) | Backend | 10 duplicate events = 1 processing |
| 4.1.3 Plan provisioning (Free/Pro/Enterprise) | Backend | Limits enforced immediately |
| 4.1.4 Subscription lifecycle (upgrade/downgrade/cancel) | Backend | Plan changes reflected in UI |
| 4.1.5 **Sandbox validation** (Stripe CLI) | QA | End-to-end flow works |

### 4.2 PVC-U Validation (2 days)
| Task | Owner | Verify |
|------|-------|--------|
| 4.2.1 Risk classification L0-L8 | Backend | Fixtures match 100% |
| 4.2.2 Degradation policies (transform/block/quarantine) | Backend | Policy applied per level |
| 4.2.3 Evidence hashing → audit trail | Backend | Evidence hash in audit event |
| 4.2.4 Model router integration | Backend | All AI calls validated |
| 4.2.5 Safe executor sandbox | Backend | Agent actions validated |

### 4.3 Open Data & Observability (1 day)
| Task | Owner | Verify |
|------|-------|--------|
| 4.3.1 Open-Meteo integration (weather) | Backend | Cached, timeout, fallback |
| 4.3.2 Provenance records (hash-only) | Backend | Hash in audit trail |
| 4.3.3 Structured logging (correlationId, PII redaction) | Backend | Logs JSON, no PII |
| 4.3.4 Metrics endpoint (Prometheus format) | Backend | `/metrics` exposes key metrics |

**Milestone:** Billing works, PVC-U validates AI, observability baseline.

---

## Phase 5: Advanced Features (3 days)

### 5.1 Plan Enforcement Matrix (1 day)
| Task | Owner | Verify |
|------|-------|--------|
| 5.1.1 Capability matrix (all features × plans) | Backend | Matrix complete, documented |
| 5.1.2 Enforcement middleware (checks on each procedure) | Backend | Free blocked, Pro allowed |
| 5.1.3 Usage tracking (employees, shifts, PVC-U calls) | Backend | Counters accurate |
| 5.1.4 Upgrade prompts in UI | Frontend | Contextual, non-intrusive |

### 5.2 Evidence Export & Retention (1 day)
| Task | Owner | Verify |
|------|-------|--------|
| 5.2.1 Audit evidence ZIP export (Pro+) | Backend | ZIP contains chain + metadata |
| 5.2.2 Role-based authorization (owner/admin only) | Backend | Manager/employee get 403 |
| 5.2.3 Retention policies (plan-based) | Backend | Configurable, enforced |

### 5.3 Exceptions & Self-Validation (1 day)
| Task | Owner | Verify |
|------|-------|--------|
| 5.3.1 Controlled exceptions (expiry, approver, compensation) | Backend | Full workflow tested |
| 5.3.2 Policy drift detection → versioned suggestions | Backend | Suggestion generated, approval logged |
| 5.3.3 Human approval workflow | Backend | Approve/reject tracked |

**Milestone:** Plan enforcement complete, evidence export works, exceptions workflow done.

---

## Phase 6: Quality Assurance (5 days)

| Task | Owner | Verify |
|------|-------|--------|
| 6.1 Unit tests ≥ 80% backend, 70% frontend | Dev | `pnpm test --coverage` |
| 6.2 Integration tests: all routers, DB ops | Dev | Testcontainers, CI passes |
| 6.3 Contract tests: tRPC, Python API | QA | No drift |
| 6.4 E2E tests: 5 critical flows | QA | Playwright, CI passes |
| 6.5 **Adversarial: multi-tenant leakage (1000 queries)** | QA | 0 cross-tenant results |
| 6.6 **Adversarial: hash tampering detection** | QA | 100% detection at correct index |
| 6.7 **Adversarial: plan bypass attempts** | QA | All blocked |
| 6.8 Accessibility: axe-core WCAG 2.1 AA | QA | 0 violations on key pages |
| 6.9 Performance: k6 load test (P95 < 200ms) | QA | Report generated |
| 6.10 PVC-U latency test (< 500ms) | QA | Report generated |
| 6.11 Security: dependency audit, SAST | QA | 0 critical/high |
| 6.12 i18n verification: 10 languages, RTL | QA | 34 tests pass |

**Milestone:** All quality gates pass, zero critical issues.

---

## Phase 7: Documentation & Deployment (2 days)

| Task | Owner | Verify |
|------|-------|--------|
| 7.1 Update README with current setup | Dev | Accurate |
| 7.2 API documentation (tRPC procedures) | Dev | Generated from types |
| 7.3 Runbooks (deploy, rollback, incident) | Dev | Markdown in `/docs/runbooks` |
| 7.4 Staging deployment (Cloud Run) | Dev | `staging.aion.app` healthy |
| 7.5 Production deployment prep (GKE manifests) | Dev | Manifests reviewed |
| 7.6 Final checkpoint: all docs, tests, build green | Team | Sign-off |

**Milestone:** Production-ready, documented, deployed to staging.

---

## Parallelizable Work

| Can Run in Parallel | Sequence Required |
|---------------------|-------------------|
| Phase 2.1 + 2.2 + 2.3 | Phase 1 complete |
| Phase 3.1 + 3.2 | Phase 2 complete |
| Phase 4.1 + 4.2 + 4.3 | Phase 2 complete |
| Phase 6.x (all) | Phase 1-5 complete |

---

## Risk Register & Mitigations

| Risk | Phase | Probability | Impact | Mitigation |
|------|-------|-------------|--------|------------|
| MySQL RLS not supported | 1 | Certain | High | App-layer isolation (ADR-0002) + tests |
| OAuth sync fails | 1 | High | High | Fix early, integration test |
| Hash chain non-deterministic | 1 | Certain | High | Fix computeHash (ADR-0003) |
| Compliance engine latency | 3 | Medium | Medium | Async, cache, circuit breaker |
| Stripe webhook duplicates | 4 | Medium | High | Idempotency table (ADR-0007) |
| PVC-U false positives | 4 | Medium | Medium | Tuning, human review loop |
| i18n RTL breaks layout | 4 | Low | Medium | Visual regression tests |
| Plan enforcement gaps | 5 | Medium | High | Matrix review, adversarial tests |
| Testcontainers flakiness | 6 | Medium | Low | Shared container, retries |

---

## Gate Criteria

| Gate | Criteria |
|------|----------|
| **Phase 1 → 2** | Auth works, 2-tenant isolation proven, audit chain verifies, public endpoint works |
| **Phase 2 → 3** | Shift/employee/incident CRUD, calendar, paginated history all working |
| **Phase 3 → 4** | Payroll CSV matches manual, compliance detects known violations |
| **Phase 4 → 5** | Stripe sandbox flow works, PVC-U classifies fixtures correctly |
| **Phase 5 → 6** | Plan matrix enforced, evidence exports, exceptions workflow |
| **Phase 6 → 7** | All quality gates pass, zero critical, staging deployed |
| **Phase 7 → Ship** | Production manifests ready, runbooks complete, team sign-off |

---

## Resource Allocation

| Role | Phase 0 | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Phase 5 | Phase 6 | Phase 7 |
|------|---------|---------|---------|---------|---------|---------|---------|---------|
| Backend | 1 | 1 | 1 | 1 | 1 | 1 | 0.5 | 0.5 |
| Frontend | 0 | 0.5 | 1 | 0.5 | 0.5 | 0.5 | 0.5 | 0.5 |
| QA/DevOps | 0.5 | 0.5 | 0.5 | 1 | 1 | 0.5 | 1 | 1 |

---

## Sign-off

**Phase 1 Complete:** ________________ **Date:** ________________
**Phase 2 Complete:** ________________ **Date:** ________________
**Phase 3 Complete:** ________________ **Date:** ________________
**Phase 4 Complete:** ________________ **Date:** ________________
**Phase 5 Complete:** ________________ **Date:** ________________
**Phase 6 Complete:** ________________ **Date:** ________________
**Phase 7 Complete:** ________________ **Date:** ________________

**Final Approval:** ________________ **Date:** ________________