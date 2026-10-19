# ADR-0004: tRPC for Type-Safe API Layer

## Status
Accepted (2026-10-19, Pedro Belentani)

## Context

AION needs a type-safe API layer between React frontend and Express backend. The team wants end-to-end type safety without code generation overhead.

Options considered:
1. **tRPC** — TypeScript-first, no codegen, React Query integration, lightweight
2. **GraphQL** — Schema-first, codegen required, overkill for internal API
3. **REST + OpenAPI/Zod** — Manual sync, drift possible, verbose
4. **gRPC** — Protobuf, not browser-native, requires gateway
5. **Custom RPC** — Reinventing wheel, maintenance burden

## Decision

**We will use tRPC v11 with @trpc/react-query for the primary API layer.**

### Implementation

- **Router per module** — `authRouter`, `shiftRouter`, `payrollRouter`, etc.
- **Procedures** — `query` (read), `mutation` (write), `subscription` (future)
- **Middleware** — Auth, tenant context, rate limiting, logging
- **Client** — `@trpc/react-query` with TanStack Query v5
- **Transformer** — `superjson` for date/Map/Set serialization

### Code Organization

```
server/
├── routers/
│   ├── auth.ts
│   ├── shift.ts
│   ├── employee.ts
│   ├── payroll.ts
│   ├── audit.ts
│   ├── compliance.ts
│   ├── pvcu.ts
│   ├── plan.ts
│   ├── incident.ts
│   ├── absence.ts
│   ├── agreement.ts
│   ├── openData.ts
│   ├── admin.ts
│   └── index.ts          # mergeRouters(appRouter)
├── trpc.ts               # initTRPC, middleware, context
└── context.ts            # Context type with tenantId, user, session
```

### Middleware Chain

```typescript
const protectedProcedure = t.procedure
  .use(authMiddleware)        // Validates JWT, attaches user
  .use(tenantMiddleware)      // Extracts tenantId, enforces isolation
  .use(rateLimitMiddleware);  // Per-tenant limits
```

### Client Usage

```typescript
// Hooks auto-generated from router types
const { data: shifts } = api.shift.list.useQuery({ 
  departmentId, 
  dateFrom, 
  dateTo 
});

const createShift = api.shift.create.useMutation({
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shift', 'list'] })
});
```

---

## Consequences

### Positive
- **End-to-End Type Safety**: Router types flow to client automatically
- **No Codegen**: Types inferred at compile time, no build step
- **React Query Integration**: Caching, invalidation, optimistic updates built-in
- **Lightweight**: ~15KB client, no GraphQL parser
- **Flexible**: Procedures can return anything, not constrained by schema

### Negative
- **TypeScript Coupling**: Client/server must share types (monorepo required)
- **No Schema Registry**: Can't share with non-TypeScript consumers (mitigated: REST endpoint for audit)
- **Learning Curve**: Team must learn tRPC patterns (mitigated: documentation, examples)
- **Subscription Support**: Limited compared to GraphQL (mitigated: WebSockets for real-time if needed)

---

## Related ADRs
- ADR-0001: Modular Monolith (routers per module)
- ADR-0002: Tenant Isolation (middleware enforces tenantId)

---

## Changelog
| Date | Author | Change |
|------|--------|--------|
| 2026-10-19 | Pedro Belentani | Initial decision |