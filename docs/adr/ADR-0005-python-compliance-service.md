# ADR-0005: Python Compliance Engine as Separate Service

## Status
Accepted (2026-10-19, Pedro Belentani)

## Context

Regulatory compliance validation requires checking shifts against complex labor laws (ES Workers Statute, PT Código Trabalho, FI Working Hours Act, EU Directive 2003/88/EC). This is CPU-intensive, rule-heavy, and benefits from Python's ecosystem (pandas, regex, date handling).

Options considered:
1. **Embedded in Node.js** — Port rules to TypeScript, run in-process
2. **Separate Python Service** — FastAPI, gRPC/REST, independent scaling
3. **WASM Module** — Compile Python to WASM, run in Node.js
4. **CLI Tool** — Call Python script via child_process per request

## Decision

**We will run the Compliance Engine as a separate Python/FastAPI service in its own Docker container.**

### Architecture

```
┌─────────────┐     HTTP/gRPC      ┌──────────────────────┐
│  Node.js    │───────────────────▶│  Compliance Engine   │
│  (tRPC)     │   JSON payload     │  (FastAPI + Python)  │
└─────────────┘                    └──────────────────────┘
       │                                    │
       │         ComplianceResult           │
       ◀────────────────────────────────────┘
```

### Interface Contract

```python
# Request
{
  "tenant_id": "nanoid",
  "shifts": [
    {
      "employee_id": "nanoid",
      "start_at": "2026-10-20T09:00:00Z",
      "end_at": "2026-10-20T17:00:00Z",
      "department_id": "nanoid",
      "agreement_version": "2024-v3"
    }
  ],
  "jurisdiction": "ES"  # ES, PT, FI, EU
}

# Response
{
  "violations": [
    {
      "shift_index": 0,
      "rule_id": "ES_ET_34_DAILY_REST",
      "article": "ET Art 34",
      "severity": "critical",
      "message": "Daily rest period less than 12 hours",
      "details": {"actual_hours": 10, "required_hours": 12}
    }
  ],
  "checked_at": "2026-10-19T10:30:00Z",
  "engine_version": "2.1.0"
}
```

### Deployment

- **Docker**: Multi-stage build (poetry → slim runtime)
- **Health**: `/health` endpoint for container orchestration
- **Scaling**: Horizontal (CPU-bound), 2-10 replicas
- **Communication**: Internal network, mTLS (future), timeout 30s
- **Fallback**: Circuit breaker in Node.js, cache last known good rules

### Data Flow

1. Node.js receives shift creation/update
2. Before commit, calls Compliance Engine (async, fire-and-forget for non-blocking)
3. Engine returns violations
4. Node.js logs to audit trail with compliance result
5. UI shows violations in real-time via tRPC subscription (future) or poll

---

## Consequences

### Positive
- **Independent Scaling**: Compliance CPU spikes don't affect API latency
- **Technology Fit**: Python best for rule engines, pandas, date math
- **Team Autonomy**: Compliance team can iterate rules without Node.js deploy
- **Testability**: Engine tested independently with pytest
- **Observability**: Separate metrics, logs, traces

### Negative
- **Network Latency**: ~5-10ms per call (mitigated: async, batch checks)
- **Operational Complexity**: Two services to deploy/monitor (mitigated: Docker Compose, shared CI)
- **Data Consistency**: Eventual consistency for compliance results (mitigated: audit trail records check result)
- **Debugging**: Distributed trace needed (mitigated: correlationId propagation)

---

## Related ADRs
- ADR-0001: Modular Monolith (compliance as extracted module)
- ADR-0003: Hash Chain (compliance checks logged to audit)

---

## Changelog
| Date | Author | Change |
|------|--------|--------|
| 2026-10-19 | Pedro Belentani | Initial decision |