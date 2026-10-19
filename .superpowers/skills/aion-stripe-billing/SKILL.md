---
name: aion-stripe-billing
description: Use when working with Stripe billing integration (Checkout Sessions, webhooks, idempotency, plan enforcement).
---

# AION Stripe Billing Skill

## Overview
Stripe Checkout Sessions with custom webhook handling. Event.id idempotency. Three tiers: Free/Pro/Enterprise with capability matrix.

## When to Use
- Creating Checkout Sessions
- Handling webhook events
- Enforcing plan limits
- Debugging billing issues

## Flow
```
User clicks "Upgrade"
    │
    ▼
Server creates Checkout Session
  - mode: subscription
  - metadata: { tenant_id, user_id }
  - success_url, cancel_url
    │
    ▼
Redirect to Stripe (hosted)
    │
    ▼
User pays → redirect to success_url
    │
    ▼
Stripe sends webhooks (async)
  - checkout.session.completed
  - invoice.paid
  - customer.subscription.*
    │
    ▼
Webhook handler (idempotent)
  1. Verify signature
  2. Check event.id in idempotency table
  3. Process if new, skip if duplicate
  4. Provision tenant plan
```

## Idempotency Table
```sql
CREATE TABLE stripe_idempotency (
  event_id VARCHAR(255) PRIMARY KEY,  -- evt_xxx
  processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  event_type VARCHAR(100),
  tenant_id CHAR(26)
);
```

## Plan Capability Matrix

| Feature | Free | Pro | Enterprise |
|---------|------|-----|------------|
| Employees | 5 | 50 | Unlimited |
| Shifts/month | 100 | 1000 | Unlimited |
| Audit Export | ❌ | ✅ | ✅ |
| Compliance Engine | ❌ | ✅ | ✅ |
| PVC-U Validation | ❌ | 100/day | Unlimited |
| Collective Agreements | ❌ | 1 | Unlimited |
| SSO/SCIM | ❌ | ❌ | ✅ |
| SLA | ❌ | ❌ | 99.9% |
| Data Residency | EU | EU | Choice |

## Enforcement Middleware
```typescript
const enforcePlan = (capability: string) => 
  t.middleware(async ({ ctx, next }) => {
    const limit = PLAN_LIMITS[ctx.tenant.plan][capability];
    const usage = await getUsage(ctx.tenantId, capability);
    if (usage >= limit) {
      throw new TRPCError({ 
        code: 'FORBIDDEN', 
        message: `Plan limit reached: ${capability}` 
      });
    }
    return next();
  });
```

## Red Flags
| Thought | Reality |
|---------|---------|
| "Webhook will only fire once" | Stripe retries - idempotency mandatory |
| "Plan change is instant" | Propagate via webhook, cache with TTL |
| "Free tier doesn't need limits" | Limits drive upgrades |

## Tests
- 10 duplicate webhooks = 1 processing
- Sandbox end-to-end flow validated
- Plan enforcement adversarial tests

## Related
- ADR-0007: Stripe Billing
- `server/modules/billing/`
- `server/stripe.webhook.ts`, `plan-policy.ts`