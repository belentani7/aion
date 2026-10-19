# ADR-0009: Observability — OpenTelemetry + Structured Logging

## Status
Proposed (2026-10-19, Pedro Belentani)

## Context

AION needs production-grade observability for debugging, compliance, and SLA monitoring. Current state: basic console logging, no metrics, no traces.

Options considered:
1. **OpenTelemetry (OTel)** — Vendor-neutral, auto-instrumentation, growing ecosystem
2. **Datadog/New Relic Agent** — Vendor lock-in, expensive, full-featured
3. **Prometheus + Grafana + Custom** — Self-hosted, flexible, operational burden
4. **Cloud Provider (CloudWatch, Cloud Monitoring)** — Lock-in, limited custom metrics

## Decision

**We will adopt OpenTelemetry as the observability framework with structured JSON logging as the immediate baseline.**

### Phase 1: Structured Logging (Immediate)

```typescript
// shared/logger.ts
interface LogEntry {
  timestamp: string;           // ISO 8601
  level: 'debug'|'info'|'warn'|'error';
  message: string;
  correlationId: string;       // Per-request, propagated
  tenantId?: string;           // When available
  userId?: string;             // When authenticated
  traceId?: string;            // OTel trace ID
  spanId?: string;             // OTel span ID
  // Domain fields (no PII)
  eventType?: string;          // SHIFT_CREATED, PAYROLL_CALCULATED
  durationMs?: number;
  error?: { name: string; message: string; stack?: string };
  // Sanitized: NO emails, names, IPs, tokens, hashes in logs
}
```

- **PII Redaction**: Middleware scrubs emails, names, IPs, tokens, hashes
- **Correlation ID**: Generated at edge, propagated via headers, async context
- **Output**: stdout (container), collected by Fluent Bit → Loki/Elastic

### Phase 2: Metrics (Prometheus Format)

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `http_requests_total` | Counter | method, path, status, tenant | Request volume |
| `http_request_duration_seconds` | Histogram | method, path, tenant | Latency |
| `tRPC_procedure_duration_seconds` | Histogram | procedure, tenant | Procedure latency |
| `audit_chain_length` | Gauge | tenant | Current chain length |
| `pvcu_validation_duration_seconds` | Histogram | risk_level, policy | PVC-U latency |
| `pvcu_risk_distribution` | Counter | risk_level, policy | Risk level counts |
| `compliance_check_duration_seconds` | Histogram | jurisdiction | Compliance engine latency |
| `stripe_webhook_processed_total` | Counter | event_type, success | Webhook processing |
| `plan_enforcement_blocked_total` | Counter | feature, plan | Plan limit hits |

### Phase 3: Distributed Tracing (OTel)

- **Auto-instrumentation**: `@opentelemetry/instrumentation-express`, `@opentelemetry/instrumentation-http`, `@opentelemetry/instrumentation-pino`
- **Manual Spans**: Critical paths (shift→payroll→audit, PVC-U validation)
- **Propagation**: W3C TraceContext headers
- **Sampling**: 10% default, 100% for errors, PVC-U high-risk
- **Export**: OTLP → Collector → Tempo/Jaeger (self-hosted) or Cloud

### Phase 4: Alerting Rules (PrometheusRule)

```yaml
groups:
- name: aion-critical
  rules:
  - alert: AuditChainVerificationFailed
    expr: increase(audit_verification_failed_total[5m]) > 0
    severity: critical
  - alert: TenantDataLeakageDetected
    expr: increase(tenant_isolation_violations_total[1m]) > 0
    severity: critical
  - alert: PVCUHighRiskSpike
    expr: rate(pvcu_risk_distribution{risk_level=~"[5-8]"}[5m]) > 10
    severity: warning
  - alert: StripeWebhookFailureRate
    expr: rate(stripe_webhook_processed_total{success="false"}[5m]) > 0.05
    severity: warning
  - alert: ComplianceEngineDown
    expr: up{job="compliance-engine"} == 0
    severity: critical
```

---

## Consequences

### Positive
- **Vendor Neutral**: Switch backends without code changes
- **Standards-Based**: CNCF graduated, wide adoption
- **Auto-Instrumentation**: Zero-code for libraries
- **Correlation**: Logs + Metrics + Traces linked via correlationId
- **Compliance Ready**: Audit trail of observability data itself

### Negative
- **Implementation Effort**: Phased approach needed
- **Cardinality Risk**: Tenant label on metrics (mitigated: limit to 1000 tenants, aggregate)
- **Sampling Complexity**: Need careful configuration (mitigated: start conservative)
- **Operational Knowledge**: Team must learn OTel (mitigated: training, docs)

---

## Related ADRs
- ADR-0003: Hash Chain (audit events also observability signals)
- ADR-0005: Compliance Service (needs separate instrumentation)
- ADR-0006: PVC-U (high-value tracing target)

---

## Changelog
| Date | Author | Change |
|------|--------|--------|
| 2026-10-19 | Pedro Belentani | Proposed |