# ADR-0003: SHA-256 Hash Chain for Immutable Audit Trail

## Status
Accepted (2026-10-19, Pedro Belentani)

## Context

AION requires an immutable audit trail for regulatory compliance (ISO 23000, GDPR Art 25, SOC2). The trail must be:
- Tamper-evident (any modification detectable)
- Verifiable by external auditors without system access
- Append-only (no updates/deletes)
- Performant for high-volume events

Options considered:
1. **SHA-256 Hash Chain** — Each event hashes previous hash + payload, genesis hash known
2. **Merkle Tree** — Batch events, periodic root hash, more complex verification
3. **Blockchain/Immutable Ledger** — External dependency, overkill, cost
4. **Database Triggers + WAL** — Database-specific, not portable, hard to verify externally
5. **Signed Events (Ed25519)** — Non-repudiation but key management complexity

## Decision

**We will use a SHA-256 hash chain with deterministic recomputation for verification.**

### Hash Chain Design

```
Event N:
  prev_hash = Event N-1.current_hash (or genesis for N=1)
  payload_hash = SHA256(canonical_json(payload))
  current_hash = SHA256(prev_hash || payload_hash || counter)
```

### Deterministic Recomputation (Critical Fix)

**Previous bug**: `computeHash` used `Date.now()` making verification impossible.

**Fix**: Hash input MUST be deterministic:
```typescript
function computeHash(prevHash: string, payload: object, sequence: number): string {
  const payloadHash = sha256(canonicalJson(payload));
  const input = `${prevHash}|${payloadHash}|${sequence}`;
  return sha256(input);
}
```

- `sequence`: Auto-increment BIGINT (database-generated, immutable)
- `canonicalJson`: Stable key ordering, no whitespace variation
- Genesis hash: `sha256("AION_GENESIS_2026")` — constant, known to auditors

### Verification Algorithm (Public Endpoint)

```
GET /api/audit/verify?tenantId=X&from=1&to=1000
1. Fetch events [from, to] ordered by sequence
2. Set current = genesis_hash
3. For each event:
   a. Recompute expected = computeHash(current, event.payload, event.sequence)
   b. If expected !== event.current_hash → return {valid: false, mismatchAt: event.sequence}
   c. current = event.current_hash
4. Return {valid: true, proof: [{sequence, current_hash}, ...]}
```

### Public Verification Endpoint

- **No authentication** — Anyone can verify
- **Rate limited** — 10 req/min/IP
- **Read-only** — No database writes
- **Proof format** — Array of `{sequence, current_hash}` for spot-checking

### Storage

| Column | Type | Purpose |
|--------|------|---------|
| `id` | BIGINT UNSIGNED AUTO_INCREMENT | Sequence (immutable) |
| `tenant_id` | CHAR(26) | Tenant isolation |
| `event_type` | VARCHAR(100) | Categorization |
| `payload_hash` | CHAR(64) | SHA256 of payload |
| `prev_hash` | CHAR(64) | Link to previous |
| `current_hash` | CHAR(64) | This event's hash |
| `actor_id` | CHAR(26) | Who triggered |
| `created_at` | TIMESTAMP(6) | Microsecond precision |

### Indexes
- `(tenant_id, created_at)` — Time-range queries
- `(tenant_id, current_hash)` — Chain verification

---

## Consequences

### Positive
- **Tamper-Evident**: Single-bit change breaks chain at that point
- **Externally Verifiable**: Auditor only needs genesis hash + event data
- **Simple**: No external dependencies, standard crypto
- **Performant**: O(n) verification, can be parallelized for spot-checks
- **Append-Only**: Natural fit for audit requirements

### Negative
- **No Non-Repudiation**: Hash chain proves integrity, not authorship (mitigated: actor_id in payload, future Ed25519 signing optional)
- **Full Chain Verification O(n)**: Large chains take time (mitigated: spot-checks, incremental verification, cached checkpoints)
- **Genesis Trust**: Auditor must trust genesis hash (mitigated: published in docs, DNS TXT record optional)

---

## Related ADRs
- ADR-0002: Tenant Isolation (audit events are tenant-scoped)
- ADR-0005: Compliance Engine (compliance checks also logged to audit)

---

## Changelog
| Date | Author | Change |
|------|--------|--------|
| 2026-10-19 | Pedro Belentani | Initial decision with deterministic fix |