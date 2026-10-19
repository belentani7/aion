# ADR-0012: Dependency Audit Strategy — Universal Fixes + Documented Exceptions

## Status
Accepted (2026-10-19, Pedro Belentani)

## Context

Automated dependency audits (`pnpm audit --audit-level=high`) on the AION Unified codebase reveal transitive vulnerabilities in the build toolchain. Following the industry-pattern analysis across 9 real-world projects (Prime Radiant, Herald-OS, Hexal, OpenInternetGateway, Interstellar-code, termpolis, obox, vietnam-accomodation-search, local-knowledge-vault), we apply universal fixes where patches exist and document exceptions where upstream patches are unavailable.

## Decision

**We apply universal overrides for patched vulnerabilities and document exceptions for unpatched transitive dev-dependencies.**

### Universal Fixes Applied (via `pnpm.overrides`)

| Package | Before | After | Advisory | Severity |
|---------|--------|-------|----------|----------|
| `esbuild` | 0.25.12 | ^0.28.2 | GHSA-g7r4-m6w7-qqqr | Low (fixed in 0.28.1+) |
| `brace-expansion` | transitive | ^2.1.2 | GHSA-75fv-7m9c-7x9m | High (DoS) |
| `dompurify` | transitive | ^3.4.12 | GHSA-c2j3-45gr-mqc4 | Low (bypass) |
| `undici` | transitive | ^7.28.0 | GHSA-vmh5-mc38-953g | High (TLS/WS DoS) |
| `tar` | ^7.5.21 | ^7.5.21 | GHSA-23hp-3jrh-7fpw | Critical (DoS) — already patched |

### Documented Exceptions (Unpatched Transitive Dev-Dependencies)

The following advisories affect **transitive dev-dependencies only** (`pnpm audit --omit=dev` reports 0 findings). They exist in the build toolchain but **do not ship in the production artifact**.

| Advisory | Package | Severity | Chain | Status |
|----------|---------|----------|-------|--------|
| GHSA-ch52-4w7c-c8xp | `http-cache-semantics` ≤4.2.0 | High | Not in AION chain (no electron-builder) | **N/A** |
| GHSA-hp3w-g68c-fv3c | `sprintf-js` ≤1.1.3 | Moderate | Not in AION chain | **N/A** |

**Note:** AION is a **web application** (React + Express + Vite), not an Electron app. The universal `electron-builder → @electron/get → got → cacheable-request → http-cache-semantics` and `@electron/get → global-agent → roarr → sprintf-js` chains **do not exist** in this project's dependency graph.

### Verification

```bash
# Production-only audit must pass
pnpm audit --omit=dev --audit-level=high
# → 0 vulnerabilities expected

# Full audit (dev included) - documented exceptions only
pnpm audit --audit-level=high
# → 0 vulnerabilities expected (no electron-builder chain)
```

## Consequences

### Positive
- All patched vulnerabilities fixed via overrides
- Zero production vulnerabilities (`--omit=dev` passes)
- No `npm audit fix --force` (avoids breaking downgrades)
- Aligned with industry best practices from 9 real projects

### Negative
- Overrides require maintenance when major versions release
- Must re-verify after any new direct dependency adds electron-builder

## Review Triggers

| Trigger | Action |
|---------|--------|
| New direct dependency adds electron-builder | Re-evaluate http-cache-semantics/sprintf-js chain |
| `http-cache-semantics` publishes patched version >4.2.0 | Remove exception, update override |
| `sprintf-js` publishes patched version >1.1.3 | Remove exception, update override |
| `electron-builder` 27 stable release | Re-evaluate strategy #2 viability |
| `pnpm audit --omit=dev` fails | Immediate block — investigate |

## Related ADRs

- ADR-0011: Deployment (Docker, Cloud Run, GKE)
- ADR-0010: Testing Strategy (includes CI audit gates)

---

## Changelog

| Date | Author | Change |
|------|--------|--------|
| 2026-10-19 | Pedro Belentani | Initial strategy based on 9-project ecosystem analysis |