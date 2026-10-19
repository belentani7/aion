# PRD: AION Unified — Enterprise Workforce Management SaaS

**Status:** Draft → In Review → **Approved** → Shipped
**Version:** 2.0.0
**Created / Last Updated:** 2026-10-19
**Author:** Pedro Belentani
**Tracking:** AION-PRD-001

---

## Problem Statement

Las PYMES y medianas empresas en Europa (ES, PT, FI, UE) carecen de una plataforma unificada que gestione **turnos, cumplimiento normativo laboral, pre-nómina y auditoría inmutable** en un solo sistema. Las soluciones actuales son fragmentadas: software de turnos separado de nómina, sin validación automática de convenios colectivos, sin audit trail verificable externamente, y sin IA para validación de interacciones agente-modelo. Esto genera riesgos legales, errores de nómina, y falta de trazabilidad.

**Para quién:** HR managers, payroll admins, compliance officers, CTOs en empresas 10-5000 empleados en ES/PT/FI/UE.
**Por qué ahora:** Regulaciones EU cada vez más estrictas (Directiva 2003/88/CE, transparencia salarial), adopción de IA en procesos internos requiere validación (PVC-U), demanda de auditoría inmutable para compliance.

---

## Target Users & Workflows

| Persona | Primary Workflow | Pain Points |
|---------|------------------|-------------|
| **HR Manager** | Crear turnos → Validar cobertura → Aprobar ausencias → Exportar a nómina | Turnos sin cubrir, conflictos de convenio, export manual propenso a errores |
| **Payroll Admin** | Recibir datos validados → Calcular nómina → Generar recibos → Exportar CSV/SEPA | Datos sucios de entrada, sin trazabilidad, recálculos manuales |
| **Compliance Officer** | Auditar turnos vs legislación → Verificar hash chain → Reportar a regulatorio | Sin endpoint público verificable, auditoría reactiva no proactiva |
| **Employee** | Ver turnos → Solicitar ausencias → Ver recibos → Reportar incidencias | UX fragmentada, sin visibilidad de cumplimiento |
| **CTO/DevOps** | Deploy → Monitor → Scale → Audit | Multi-tenancy leaks, no observabilidad PVC-U, Stripe sync issues |

---

## MVP Scope — Features (MoSCoW)

| Prio | Feature | GWT Criterion |
|------|---------|---------------|
| **M** | Multi-tenant auth (registration, login, RBAC) | Given a new company registers When they complete signup Then a tenant is created with owner role and Free plan limits enforced |
| **M** | Shift management (CRUD, calendar week/month, filters) | Given a manager creates a shift When they assign employee/department Then shift appears in calendar with conflict detection vs collective agreement |
| **M** | Pre-payroll calculation (hours, overtime, night, holidays, supplements) | Given approved shifts for period When payroll is calculated Then CSV export matches collective agreement rules with SHA-256 hash per record |
| **M** | Immutable audit trail (SHA-256 hash chain, append-only) | Given any audit event When recorded Then hash links to previous, verification endpoint returns valid/invalid with proof |
| **M** | Public audit verification endpoint (`/api/audit/verify`) | Given external auditor calls endpoint with tenant+chain When valid Then returns `{valid: true, proof: [...]}` When tampered Then returns `{valid: false, mismatchAt: N}` |
| **M** | Regulatory compliance engine (Python) — ES/PT/FI/UE | Given shift data When compliance check runs Then violations returned with article references (ET Art 34, CT Art 203, WHA Ch 2, EU Dir 2003/88) |
| **M** | Stripe Billing (Free/Pro/Enterprise, Checkout, Webhooks, idempotency) | Given user subscribes to Pro When Checkout completes Then tenant plan updated, limits enforced, webhook idempotent |
| **M** | Multi-tenancy isolation (RLS-equivalent at app layer, defensive joins) | Given two tenants When tenant A queries data Then only tenant A data returned (zero leakage proven by tests) |
| **M** | PVC-U AI Validation Core (risk classification L0-L8, degradation policies) | Given AI interaction When validated Then risk level assigned, evidence hashed, degradation policy applied if needed |
| **M** | i18n (10 languages: ES/EN/FR/DE/IT/PT/ZH/JA/RU/AR with RTL) | Given user selects AR When UI renders Then `dir=rtl`, `lang=ar`, date/currency formats regional |
| **S** | Employee profile with full paginated history (shifts, payroll, incidents) | Given employee with 100+ shifts When viewing history Then cursor pagination works, no artificial 3-item limit |
| **S** | Incidents UI (CRUD, resolution, filters per employee) | Given manager opens incidents When they filter by employee/status Then results match backend with tenant isolation |
| **S** | Collective agreements (versioned rules: overtime, night, holidays, supplements) | Given agreement v2 active When calculating payroll Then v2 rules applied, v1 archived, both auditable |
| **S** | Absences approved/rejected → metrics & payroll (no double-count) | Given approved absence When payroll runs Then hours excluded from worked, counted as paid absence, not double-counted |
| **S** | Evidence retention/export with plan+role authorization | Given Pro tenant requests audit export When authorized Then ZIP with hash chain + metadata, Free tenant denied |
| **S** | Controlled exceptions (expiry, approver, compensation log) | Given exception requested When approved Then logged with compensating control, auto-expires, auditable |
| **S** | Operational self-validation loop (versioned policy suggestions, human approval) | Given policy drift detected When suggestion generated Then human approves/rejects, applied version logged |
| **C** | SSO/SCIM (SAML/OIDC, provisioning) | — |
| **C** | SLA/SLO dashboards (RPO/RTO, data residency controls) | — |
| **C** | Pentest report integration as documented product control | — |
| **W** | Mobile app (React Native) | — |
| **W** | AI-powered shift optimization (ML scheduling) | — |

---

## User Stories

- [ ] **US-1**: As a **HR Manager**, I want to **create and assign shifts with automatic conflict detection** so that **I avoid coverage gaps and collective agreement violations**. **Priority: M**
- [ ] **US-2**: As a **Payroll Admin**, I want to **receive pre-validated shift data with hash verification** so that **I can calculate payroll without manual reconciliation**. **Priority: M**
- [ ] **US-3**: As a **Compliance Officer**, I want to **verify the audit trail integrity via public endpoint** so that **I can prove regulatory compliance without internal access**. **Priority: M**
- [ ] **US-4**: As a **Developer**, I want to **integrate AI agents with PVC-U validation** so that **all model interactions are risk-classified and auditable**. **Priority: M**
- [ ] **US-5**: As a **Global Company**, I want to **operate in 10 languages with regional formats** so that **local teams use native UX**. **Priority: M**
- [ ] **US-6**: As a **Manager**, I want to **view full employee history with pagination** so that **I can audit any period without artificial limits**. **Priority: S**
- [ ] **US-7**: As a **Compliance Officer**, I want to **manage versioned collective agreements** so that **payroll rules are traceable to specific agreement versions**. **Priority: S**
- [ ] **US-8**: As a **Tenant Admin**, I want to **configure plan limits and see enforcement matrix** so that **I understand feature boundaries**. **Priority: S**

---

## Success Metrics

| Metric | Target | Window |
|--------|--------|--------|
| **Primary**: Tenant activation rate (signup → first shift created) | > 60% | 30 days post-GA |
| **Guardrail**: Multi-tenant data leakage incidents | 0 | Continuous |
| **Guardrail**: Audit trail verification false positives | 0 | Continuous |
| **Guardrail**: P95 API latency (tRPC) | < 200ms | Continuous |
| **Secondary**: Compliance engine violation detection accuracy | > 95% vs manual audit | 90 days |
| **Secondary**: Stripe webhook success rate | > 99.9% | Continuous |
| **Secondary**: i18n coverage (visible strings localized) | 100% for M/S features | GA |

---

## Out of Scope (Explicit)

- [ ] Native mobile apps (React Native / Flutter)
- [ ] ML-based shift optimization (scheduling algorithm)
- [ ] Custom workflow builder (no-code)
- [ ] Integration with legacy on-premise HRIS (SAP, Workday) — API only
- [ ] Payroll tax filing (only pre-payroll calculation + export)
- [ ] Employee self-service portal beyond current scope (shifts, absences, pay stubs, incidents)

---

## Data Model (Core Entities)

```
Tenant (1) ──< Membership >── (N) User
Tenant (1) ──< Employee >── (N) Shift
Tenant (1) ──< Department >── (N) Employee
Tenant (1) ──< CollectiveAgreement >── (N) PayrollRule
Tenant (1) ──< Shift >── (N) ShiftAssignment
Tenant (1) ──< PayrollPeriod >── (N) PayrollRecord
Tenant (1) ──< Incident >── (N) User (reporter/assignee)
Tenant (1) ──< Absence >── (N) Employee
Tenant (1) ──< AuditEvent >── (N) — append-only, hash-chained
Tenant (1) ──< PVCUValidation >── (N) — risk, evidence, policy
Plan (Free/Pro/Enterprise) ──< Tenant
```

**Key Fields:**
- `AuditEvent`: `id`, `tenantId`, `eventType`, `payloadHash`, `prevHash`, `currentHash`, `timestamp`, `actorId`
- `PVCUValidation`: `id`, `tenantId`, `requestHash`, `responseHash`, `riskLevel (L0-L8)`, `policyApplied`, `evidenceHash`, `timestamp`
- `PayrollRecord`: `id`, `tenantId`, `employeeId`, `periodId`, `hoursRegular`, `hoursOvertime`, `hoursNight`, `hoursHoliday`, `supplements`, `gross`, `net`, `hash`

---

## API Endpoints (tRPC + REST)

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| POST | `/api/auth/register` | Tenant registration + owner creation | Public |
| POST | `/api/auth/login` | JWT issuance | Public |
| GET | `/api/trpc/shift.*` | Shift CRUD, calendar, conflicts | Tenant member |
| GET | `/api/trpc/payroll.*` | Calculate, export, records | Manager+ |
| GET | `/api/trpc/audit.*` | Query events, verify chain | Auditor+ |
| **GET** | **`/api/audit/verify`** | **Public verification (REST)** | **Public (rate-limited)** |
| POST | `/api/trpc/compliance.check` | Run compliance validation | Manager+ |
| POST | `/api/trpc/pvcu.validate` | Validate AI interaction | Service-to-service |
| POST | `/api/webhooks/stripe` | Stripe events (idempotent) | Stripe signature |
| GET | `/api/trpc/plan.*` | Limits, enforcement, usage | Owner/Admin |

---

## Risks, Dependencies & Open Questions

| Risk | Impact | Likelihood | Mitigation | Owner | Due |
|------|--------|------------|------------|-------|-----|
| MySQL managed DB doesn't support RLS | High | Certain | App-layer isolation with defensive joins + tests | Backend lead | 2026-10-25 |
| OAuth sync creates membership without tenantId | High | High | Fix sync flow, add integration test | Backend lead | 2026-10-22 |
| Stripe webhook idempotency failures | Medium | Medium | Event ID dedup, retry with backoff | Backend lead | 2026-10-24 |
| PVC-U validation latency > 500ms | Medium | Medium | Async validation, cached policies, streaming | AI lead | 2026-11-01 |
| i18n RTL layout breaks in complex components | Medium | Low | Automated visual regression tests | Frontend lead | 2026-10-30 |
| Collective agreement versioning complexity | Medium | Medium | Explicit version field, migration scripts | Backend lead | 2026-11-05 |
| **Open Question**: TiDB vs MySQL managed for production? | — | — | Benchmark both, decide by 2026-10-26 | CTO | 2026-10-26 |
| **Open Question**: PVC-U policy versioning strategy? | — | — | Semantic versioning + approval workflow | AI lead | 2026-10-28 |

---

## Gate: PRD Approval

**Human approval required before proceeding to SRS/SDD.**

- [ ] Problem statement validated
- [ ] User stories cover M/S features
- [ ] GWT criteria defined for all M/S
- [ ] Success metrics agreed
- [ ] Out of scope explicit
- [ ] Data model/API endpoints reviewed
- [ ] Risks documented with owners

**Approved by:** ________________ **Date:** ________________