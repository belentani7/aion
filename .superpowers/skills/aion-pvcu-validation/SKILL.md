---
name: aion-pvcu-validation
description: Use when implementing or debugging PVC-U AI validation (risk classification L0-L8, degradation policies, evidence hashing).
---

# AION PVC-U Validation Skill

## Overview
PVC-U (Policy Validation & Compliance Unit) validates all AI interactions with risk classification L0-L8 and graduated degradation policies.

## When to Use
- Adding new AI validation checks
- Modifying risk levels or policies
- Debugging false positives/negatives
- Integrating new AI models/agents

## Risk Levels (L0-L8)

| Level | Name | Policy |
|-------|------|--------|
| L0 | Benign | Allow |
| L1 | Low | Allow + Log |
| L2 | Notice | Allow + Redact PII + Log |
| L3 | Warning | Allow + Flag + Log |
| L4 | Caution | Transform (sanitize) + Log |
| L5 | Elevated | Block + Alert |
| L6 | High | Block + Alert + Quarantine |
| L7 | Critical | Block + Incident Response |
| L8 | Emergency | Block + Auto-Isolate + Pager |

## Pipeline
```
AI Request
    │
    ▼
Static Checks (regex, patterns) ──▶ <5ms
    │
    ▼
Semantic Checks (embeddings, groundedness) ──▶ <500ms async
    │
    ▼
Policy Engine (apply degradation) ──▶ <1ms
    │
    ▼
Evidence Log (hash → audit trail)
```

## Evidence Structure
```typescript
interface PVCUEvidence {
  id: string;
  tenantId: string;
  requestHash: string;      // SHA256(request)
  responseHash?: string;    // SHA256(response)
  riskLevel: number;        // 0-8
  policyApplied: string;
  checks: CheckResult[];
  evidenceHash: string;     // Hash of all above → audit trail
  createdAt: Date;
}
```

## Degradation Policy Example
```typescript
const policies: Record<number, DegradationPolicy> = {
  0: { level: 0, action: 'allow' },
  1: { level: 1, action: 'allow', alert: false },
  2: { level: 2, action: 'transform', transform: redactPII },
  4: { level: 4, action: 'transform', transform: sanitizePrompt },
  5: { level: 5, action: 'block', alert: true },
  6: { level: 6, action: 'quarantine', alert: true, quarantine: true },
};
```

## Integration
```typescript
// In modelRouter.ts
const validation = await pvcu.validate({
  tenantId: ctx.tenantId,
  request: userPrompt,
  response: modelResponse,
  context: { agentId, sessionId },
});

if (validation.action === 'block') {
  throw new TRPCError({ code: 'FORBIDDEN', message: 'PVC-U: Content blocked' });
}
if (validation.transformed) {
  return validation.transformedResponse;
}
```

## Red Flags
| Thought | Reality |
|---------|---------|
| "Sync validation is fine" | Adds latency - use async for semantic checks |
| "No false positives possible" | Tuning required - human review loop essential |
| "One policy fits all" | Policies versioned per tenant/plan |

## Tests
- `tests/unit/pvcu-risk.test.ts` — Fixtures match 100%
- `tests/integration/pvcu.test.ts` — Pipeline end-to-end

## Related
- ADR-0006: PVC-U Validation
- `server/modules/pvcu/`
- `server/aion/modelRouter.ts`, `safeExecutor.ts`