---
name: aion-compliance-engine
description: Use when integrating with or debugging AION's Python compliance engine (ES/PT/FI/UE labor law validation).
---

# AION Compliance Engine Skill

## Overview
Separate Python/FastAPI service validating shifts against 4 jurisdictions. Called asynchronously from Node.js with circuit breaker.

## When to Use
- Adding new compliance rules
- Debugging validation failures
- Extending to new jurisdictions
- Integrating with shift creation flow

## Architecture
```
Node.js (tRPC) ──HTTP──▶ Python FastAPI (port 8000)
  shift.create         /check endpoint
       │                    │
       │   {violations[]}   │
       ◀────────────────────┘
```

## Request/Response Contract

```python
# Request
{
  "tenant_id": "nanoid",
  "shifts": [{
    "employee_id": "nanoid",
    "start_at": "2026-10-20T09:00:00Z",
    "end_at": "2026-10-20T17:00:00Z",
    "agreement_version": "2024-v3"
  }],
  "jurisdiction": "ES"  # ES, PT, FI, EU
}

# Response
{
  "violations": [{
    "shift_index": 0,
    "rule_id": "ES_ET_34_DAILY_REST",
    "article": "ET Art 34",
    "severity": "critical",
    "message": "Daily rest period less than 12 hours",
    "details": {"actual_hours": 10, "required_hours": 12}
  }],
  "checked_at": "2026-10-19T10:30:00Z",
  "engine_version": "2.1.0"
}
```

## Jurisdiction Rules (Key Articles)

| Jurisdiction | Key Rules |
|--------------|-----------|
| **ES (Spain)** | ET Art 34 (daily rest 12h), Art 35 (weekly rest 36h), Art 36 (max 9h/day), Art 47 (overtime limits) |
| **PT (Portugal)** | CT Art 203 (daily rest 11h), Art 204 (weekly rest 35h), Art 208 (overtime 2h/day) |
| **FI (Finland)** | WHA Ch 2 (daily rest 11h), Ch 3 (weekly rest 35h), Ch 4 (max 8h/day avg) |
| **EU** | Directive 2003/88/EC (48h week avg, 11h daily rest, 24h weekly rest) |

## Integration Pattern (Node.js)
```typescript
// With circuit breaker
const result = await complianceClient.check({
  tenantId: ctx.tenantId,
  shifts: validatedShifts,
  jurisdiction: tenant.jurisdiction,
}).catch(() => ({ violations: [], fallback: true }));

if (result.violations.length > 0) {
  await ledger.recordAuditEvent({
    eventType: 'COMPLIANCE_VIOLATIONS',
    payload: { violations: result.violations },
  });
}
```

## Testing
- Unit: `services/compliance/test_agent.py` (pytest)
- Contract: `tests/contract/compliance-api.test.ts`
- Corpus: Known violations >95% recall, >90% precision

## Red Flags
| Thought | Reality |
|---------|---------|
| "Sync call is fine" | Blocks shift creation - use async |
| "One rule per article" | Articles have multiple sub-rules |
| "No fallback needed" | Engine can be down - circuit breaker required |

## Related
- ADR-0005: Python Compliance Service
- `services/compliance/agent.py`
- `server/modules/compliance/`