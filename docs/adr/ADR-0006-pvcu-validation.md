# ADR-0006: PVC-U Validation Architecture (Risk Classification L0-L8)

## Status
Accepted (2026-10-19, Pedro Belentani)

## Context

AION includes AI agents that interact with LLMs. These interactions must be validated for safety, compliance, and quality. PVC-U (Policy Validation & Compliance Unit) provides a framework for classifying risk and applying degradation policies.

Options considered:
1. **Inline Validation** — Validate in request path, block if high risk
2. **Async Validation with Degradation** — Fire-and-forget, apply policy post-facto
3. **Proxy Pattern** — All AI traffic routes through PVC-U proxy
4. **Audit-Only** — Log everything, human review later

## Decision

**We will use Async Validation with Degradation Policies (L0-L8) and structured evidence logging.**

### Risk Levels (L0-L8)

| Level | Name | Description | Default Policy |
|-------|------|-------------|----------------|
| L0 | Benign | No risk detected | Allow |
| L1 | Low | Minor style/tone issues | Allow + Log |
| L2 | Notice | Potential PII in prompt | Allow + Redact + Log |
| L3 | Warning | Factual inconsistency detected | Allow + Flag + Log |
| L4 | Caution | Prompt injection attempt | Transform + Log |
| L5 | Elevated | Policy violation (content) | Block + Alert |
| L6 | High | Security-relevant (code exec, data exfil) | Block + Alert + Quarantine |
| L7 | Critical | Confirmed malicious intent | Block + Incident Response |
| L8 | Emergency | Active attack / system compromise | Block + Auto-Isolate + Pager |

### Degradation Policies

```typescript
interface DegradationPolicy {
  level: number;           // L0-L8
  action: 'allow' | 'transform' | 'block' | 'quarantine';
  transform?: (input: string) => string;  // Redact, sanitize, rewrite
  alert?: boolean;         // Notify security team
  quarantine?: boolean;    // Isolate session/agent
  requiresHumanReview?: boolean;
}
```

### Validation Pipeline

```
AI Request
    │
    ▼
┌─────────────────┐
│  Static Checks  │  ──▶ Regex (PII, secrets, patterns)
│  (Sync, <5ms)   │
└─────────────────┘
    │
    ▼
┌─────────────────┐
│  Semantic Checks│  ──▶ Embedding similarity, groundedness
│  (Async, <500ms)│      Consistency, bias detection
└─────────────────┘
    │
    ▼
┌─────────────────┐
│  Policy Engine  │  ──▶ Apply degradation policy per level
│  (Sync, <1ms)   │
└─────────────────┘
    │
    ▼
┌─────────────────┐
│  Evidence Log   │  ──▶ Hash → Audit Trail + PVC-U Store
└─────────────────┘
```

### Evidence Structure

```typescript
interface PVCUEvidence {
  id: string;                    // nanoid
  tenantId: string;
  requestHash: string;           // SHA256(request)
  responseHash?: string;         // SHA256(response)
  riskLevel: number;             // 0-8
  policyApplied: string;         // policy name/version
  checks: CheckResult[];         // Individual check results
  evidenceHash: string;          // SHA256 of all above
  createdAt: Date;
}
```

### Integration Points

- **tRPC Middleware**: Wraps AI agent calls
- **Model Router** (`server/aion/modelRouter.ts`): Routes to PVC-U before/after model call
- **Safe Executor** (`server/aion/safeExecutor.ts`): Sandbox for agent actions
- **Audit Trail**: Every validation logged with hash chain link

---

## Consequences

### Positive
- **Non-Blocking**: Async validation doesn't add latency to happy path
- **Graduated Response**: Policies match risk severity
- **Auditable**: Every decision hashed and linked to audit trail
- **Extensible**: New checks added without changing pipeline
- **Human-in-Loop**: High-risk cases escalate for review

### Negative
- **Eventual Consistency**: Response may be transformed after delivery (mitigated: streaming UI shows "validating...")
- **Complexity**: Multiple check types, policy versioning (mitigated: clear interfaces, tests)
- **False Positives**: Legitimate requests blocked (mitigated: tuning, human review feedback loop)

---

## Related ADRs
- ADR-0001: Modular Monolith (PVC-U as module)
- ADR-0003: Hash Chain (evidence hashed to audit)
- ADR-0005: Compliance Service (similar async pattern)

---

## Changelog
| Date | Author | Change |
|------|--------|--------|
| 2026-10-19 | Pedro Belentani | Initial decision |