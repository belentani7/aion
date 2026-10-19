# SRS: AION Unified — Software Requirements Specification

**Version:** 2.0.0
**Status:** Draft
**Based on:** PRD-AION-UNIFIED.md
**Date:** 2026-10-19

---

## Functional Requirements (FR-XXX)

| ID | Type | Requirement | Prio | GWT | Origin |
|----|------|-------------|------|-----|--------|
| FR-001 | Auth | System SHALL allow new company registration creating tenant with owner role | M | Given new company When signup completes Then tenant created with owner role and Free plan | US-1 |
| FR-002 | Auth | System SHALL issue JWT on valid login with tenant context | M | Given valid credentials When login Then JWT contains tenantId, role, exp | US-1 |
| FR-003 | Auth | System SHALL enforce RBAC (owner/admin/manager/employee) on all tRPC procedures | M | Given user with role When calling procedure Then access granted/denied per policy | US-1 |
| FR-010 | Shifts | System SHALL allow CRUD shifts with employee/department assignment | M | Given manager creates shift When saved Then appears in calendar with conflict check | US-1 |
| FR-011 | Shifts | System SHALL detect collective agreement conflicts on shift creation | M | Given shift violates agreement When created Then violation returned with article ref | US-1 |
| FR-012 | Shifts | System SHALL support weekly/monthly calendar views with filters | M | Given calendar view When filters applied Then only matching shifts displayed | US-1 |
| FR-020 | Payroll | System SHALL calculate hours (regular, overtime, night, holiday) per agreement | M | Given approved shifts When calculate Then hours match agreement rules exactly | US-2 |
| FR-021 | Payroll | System SHALL generate payroll records with SHA-256 hash per record | M | Given payroll run When records created Then each has hash linking to previous | US-2 |
| FR-022 | Payroll | System SHALL export payroll to CSV with all components | M | Given payroll period When export Then CSV includes hours, supplements, gross, net, hash | US-2 |
| FR-030 | Audit | System SHALL record all audit events append-only with hash chain | M | Given any auditable action When occurs Then event recorded with prevHash/currentHash | US-3 |
| FR-031 | Audit | System SHALL provide public REST endpoint `/api/audit/verify` | M | Given external call When valid chain Then `{valid:true,proof:[...]}` When tampered Then `{valid:false,mismatchAt:N}` | US-3 |
| FR-032 | Audit | System SHALL rate-limit public audit endpoint (10 req/min per IP) | M | Given 11th request in minute When called Then 429 returned | US-3 |
| FR-040 | Compliance | System SHALL validate shifts against ES Workers Statute (ET Art 34) | M | Given shift data When check runs Then violations with article references | US-3 |
| FR-041 | Compliance | System SHALL validate shifts against PT Código Trabalho (Art 203) | M | Given shift data When check runs Then violations with article references | US-3 |
| FR-042 | Compliance | System SHALL validate shifts against FI Working Hours Act (Ch 2) | M | Given shift data When check runs Then violations with article references | US-3 |
| FR-043 | Compliance | System SHALL validate shifts against EU Directive 2003/88/EC | M | Given shift data When check runs Then violations with article references | US-3 |
| FR-050 | Billing | System SHALL integrate Stripe Checkout for plan upgrades | M | Given user selects Pro When Checkout completes Then tenant plan updated | US-1 |
| FR-051 | Billing | System SHALL process Stripe webhooks with idempotency (event.id) | M | Given duplicate webhook When processed Then no-op, logged | US-1 |
| FR-052 | Billing | System SHALL enforce plan limits (employees, features) at runtime | M | Given Free tenant at limit When adding employee Then blocked with upgrade prompt | US-1 |
| FR-060 | Tenancy | System SHALL isolate all queries by tenantId (zero leakage) | M | Given two tenants When tenant A queries Then only tenant A data returned | US-1 |
| FR-061 | Tenancy | System SHALL use defensive joins (tenantId on all tables) | M | Given any query When executed Then tenantId in WHERE/JOIN | US-1 |
| FR-062 | Tenancy | System SHALL fix OAuth sync to include valid tenantId on membership | M | Given OAuth callback When sync Then membership created with tenantId | US-1 |
| FR-070 | PVC-U | System SHALL classify AI interactions risk L0-L8 | M | Given AI request/response When validated Then riskLevel assigned | US-4 |
| FR-071 | PVC-U | System SHALL apply degradation policies per risk level | M | Given risk L5+ When validated Then policy applied (block/transform/log) | US-4 |
| FR-072 | PVC-U | System SHALL hash evidence and link to audit trail | M | Given validation When complete Then evidenceHash recorded in audit | US-4 |
| FR-080 | i18n | System SHALL support 10 languages with regional formats | M | Given user selects language When UI renders Then all strings localized, formats regional | US-5 |
| FR-081 | i18n | System SHALL support RTL (Arabic) with `dir=rtl`, `lang=ar` | M | Given AR selected When render Then RTL layout, date/currency AR formats | US-5 |
| FR-090 | Employee | System SHALL provide full paginated history (cursor-based) | S | Given 100+ shifts When history viewed Then pagination works, no 3-item limit | US-6 |
| FR-091 | Incidents | System SHALL provide CRUD incidents with resolution workflow | S | Given manager opens incidents When filter by employee/status Then results match | US-6 |
| FR-100 | Agreements | System SHALL version collective agreements with explicit version field | S | Given agreement v2 active When payroll Then v2 rules, v1 archived | US-7 |
| FR-101 | Agreements | System SHALL support payroll rules: overtime, night, holiday, supplements | S | Given agreement When payroll Then each rule type calculated correctly | US-7 |
| FR-110 | Absences | System SHALL integrate approved absences into payroll (no double-count) | S | Given approved absence When payroll Then hours excluded from worked, counted as paid | US-7 |
| FR-120 | Evidence | System SHALL export audit evidence ZIP with authorization (plan+role) | S | Given Pro tenant authorized When export Then ZIP with chain+metadata | US-8 |
| FR-121 | Evidence | System SHALL deny export to Free plan / unauthorized role | S | Given Free tenant When export Then 403 with upgrade prompt | US-8 |
| FR-130 | Exceptions | System SHALL support controlled exceptions (expiry, approver, compensation) | S | Given exception requested When approved Then logged, auto-expires, auditable | US-8 |
| FR-140 | Self-validation | System SHALL detect policy drift and suggest versioned policies | S | Given drift When detected Then suggestion generated, human approval required | US-8 |

---

## Non-Functional Requirements (NFR-XXX)

| ID | Type | Requirement | Prio | Measurable Target |
|----|------|-------------|------|-------------------|
| NFR-001 | Performance | API P95 latency (tRPC) | M | < 200ms |
| NFR-002 | Performance | PVC-U validation latency | M | < 500ms (async target < 2s) |
| NFR-003 | Performance | Build time (CI) | S | < 5 min |
| NFR-004 | Security | Multi-tenant data leakage | M | 0 incidents (proven by tests) |
| NFR-005 | Security | Audit trail verification false positives | M | 0 |
| NFR-006 | Security | JWT token expiry | M | 15min access, 7d refresh |
| NFR-007 | Security | Stripe webhook signature verification | M | 100% validated |
| NFR-008 | Security | Rate limiting on public endpoints | M | 10 req/min audit, 60 req/min auth |
| NFR-009 | Reliability | Uptime (managed runtime) | M | 99.9% |
| NFR-010 | Reliability | Database migration idempotency | M | Re-runnable without error |
| NFR-011 | Reliability | Seed script deterministic | M | Same output every run |
| NFR-012 | Scalability | Concurrent tenants | S | 1000+ on single instance |
| NFR-013 | Scalability | Shifts per tenant | S | 100k+ |
| NFR-014 | Usability | i18n visible string coverage (M/S features) | M | 100% |
| NFR-015 | Usability | Accessibility (WCAG 2.1 AA) | S | Automated axe-core tests pass |
| NFR-016 | Operability | Structured logging (JSON, correlationId) | M | All requests logged |
| NFR-017 | Operability | PVC-U observability (latency, result, errors sanitized) | M | 100% interactions logged |
| NFR-018 | Data | Backup/RPO | S | RPO < 1hr (managed DB) |
| NFR-019 | Data | Data residency (EU) | M | All data in EU regions |
| NFR-020 | Compliance | GDPR Art 25 (privacy by design) | M | PII redacted in logs, audit |
| NFR-021 | Compliance | SOC2 Type II controls documented | C | Controls mapped to features |

---

## Traceability Matrix (Initial)

| FR-ID | PRD User Story | SDD Component | Test ID (Planned) |
|-------|---------------|---------------|-------------------|
| FR-001..003 | US-1 | Auth module, tenant-context.ts | test-auth-registration, test-rbac |
| FR-010..012 | US-1 | Shift router, calendar component | test-shift-crud, test-conflict-detection |
| FR-020..022 | US-2 | payroll-policy.ts, CSV export | test-payroll-calc, test-csv-export |
| FR-030..032 | US-3 | ledger.service.ts, audit REST endpoint | test-hash-chain, test-verify-endpoint |
| FR-040..043 | US-3 | services/compliance/agent.py | test-compliance-ES, PT, FI, EU |
| FR-050..052 | US-1 | stripe.webhook.ts, plan-policy.ts | test-stripe-checkout, test-webhook-idempotency |
| FR-060..062 | US-1 | tenant-context.ts, middleware | test-tenant-isolation, test-oauth-sync |
| FR-070..072 | US-4 | server/aion/pvcu*.ts | test-pvcu-risk, test-pvcu-degradation |
| FR-080..081 | US-5 | i18n.ts, RTL components | test-i18n-10langs, test-rtl-ar |
| FR-090 | US-6 | Employee history router, pagination | test-history-pagination |
| FR-091 | US-6 | Incidents router, UI | test-incidents-crud |
| FR-100..101 | US-7 | payroll-policy.ts, agreements router | test-agreements-versioning |
| FR-110 | US-7 | Absences router, payroll calc | test-absences-payroll |
| FR-120..121 | US-8 | Audit export router, plan limits | test-evidence-export |
| FR-130 | US-8 | Exceptions router | test-exceptions-workflow |
| FR-140 | US-8 | Self-validation loop | test-self-validation |

---

## Acceptance Criteria Summary (GWT)

All M-priority FRs have complete GWT in PRD. S-priority FRs have GWT in PRD. C/W have descriptions only.

**Verification Strategy:** Each FR will be verified by:
1. Unit test (logic)
2. Integration test (DB/API)
3. E2E test (critical flows: signup→shift→payroll→audit)
4. Adversarial test (multi-tenant leakage, tampering detection)

**First Verification Point:** After Phase 1 (Foundation) — auth, tenancy, audit trail basics working.

---

## Change Impact Map

| Change Area | Direct Impact | Indirect Impact | No Effect |
|-------------|---------------|-----------------|-----------|
| Tenant isolation fix | All routers, middleware | Seed, tests, OAuth | UI components |
| Hash chain recompute | ledger.service.ts, verify endpoint | Payroll records, PVC-U evidence | Shift CRUD |
| Collective agreement versioning | payroll-policy.ts, agreements router | Payroll calc, CSV export | Auth, shifts |
| PVC-U policy versioning | pvcu*.ts, audit trail | Compliance, self-validation | Billing, i18n |
| i18n RTL fixes | All UI components, i18n.ts | Date/currency utilities | Backend logic |

---

## Gate: SRS Approval

**Human approval required before proceeding to SDD/Design.**

- [ ] All FRs trace to PRD user stories
- [ ] All FRs have GWT (M/S) or description (C/W)
- [ ] NFRs have measurable targets
- [ ] Traceability matrix complete
- [ ] Change impact map reviewed
- [ ] Verification strategy defined

**Approved by:** ________________ **Date:** ________________