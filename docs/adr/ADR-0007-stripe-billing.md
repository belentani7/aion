# ADR-0007: Stripe Billing Integration with Idempotency

## Status
Accepted (2026-10-19, Pedro Belentani)

## Context

AION needs subscription billing with three tiers (Free, Pro, Enterprise). Stripe is the chosen payment processor. Key requirements: Checkout Sessions, Webhooks, Idempotency, Plan enforcement.

Options considered:
1. **Stripe Billing Portal + Subscriptions** — Full Stripe-managed, less control
2. **Checkout Sessions + Custom Webhook Handling** — Control over provisioning, explicit idempotency
3. **Payment Links** — Simple but no metadata, hard to link to tenant
4. **Manual Invoicing** — Not automated, doesn't scale

## Decision

**We will use Stripe Checkout Sessions with custom webhook handling and event.id idempotency.**

### Flow

```
1. User clicks "Upgrade to Pro"
       │
       ▼
2. Server creates Checkout Session
   - mode: subscription
   - line_items: price_pro_monthly
   - metadata: { tenant_id, user_id }
   - success_url: /billing/success?session_id={CHECKOUT_SESSION_ID}
   - cancel_url: /billing/cancel
       │
       ▼
3. Redirect to Stripe Checkout (hosted)
       │
       ▼
4. User pays → Stripe redirects to success_url
       │
       ▼
5. Stripe sends webhook events (async):
   - checkout.session.completed
   - invoice.paid
   - customer.subscription.created
   - customer.subscription.updated
   - customer.subscription.deleted
       │
       ▼
6. Webhook handler (idempotent):
   - Verify Stripe signature
   - Check event.id in idempotency table
   - If new: process, store event.id
   - If duplicate: no-op, log
       │
       ▼
7. Provision tenant: update plan, limits, features
```

### Idempotency Implementation

```sql
CREATE TABLE stripe_idempotency (
  event_id VARCHAR(255) PRIMARY KEY,  -- evt_xxx
  processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  event_type VARCHAR(100),
  tenant_id CHAR(26)
);
```

```typescript
async function handleStripeWebhook(event: Stripe.Event) {
  // 1. Verify signature (already done by Stripe middleware)
  
  // 2. Idempotency check
  const exists = await db.select()
    .from(stripeIdempotency)
    .where(eq(stripeIdempotency.eventId, event.id))
    .limit(1);
  
  if (exists.length > 0) {
    logger.info({ eventId: event.id }, 'Duplicate Stripe event, skipping');
    return { received: true, duplicate: true };
  }
  
  // 3. Process event
  await processStripeEvent(event);
  
  // 4. Record idempotency
  await db.insert(stripeIdempotency).values({
    eventId: event.id,
    eventType: event.type,
    tenantId: extractTenantId(event),
  });
}
```

### Plan Enforcement

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

### Webhook Security

- **Signature Verification**: `stripe.webhooks.constructEvent(payload, sig, secret)`
- **Timestamp Tolerance**: 5 min (replay protection)
- **Rate Limiting**: 100 req/min on webhook endpoint
- **TLS**: Enforced by Stripe

---

## Consequences

### Positive
- **Full Control**: Provisioning logic in our code
- **Idempotent**: Duplicate webhooks safely ignored
- **Audit Trail**: Every billing event logged to hash chain
- **Testable**: Stripe CLI for local testing, test fixtures
- **Flexible**: Easy to add plans, trials, coupons

### Negative
- **Webhook Reliability**: Must handle retries, ordering (mitigated: idempotency, eventual consistency)
- **PCI Scope**: Checkout reduces but doesn't eliminate (mitigated: SAQ-A)
- **Stripe Dependency**: Vendor lock-in (mitigated: abstraction layer in billing module)

---

## Related ADRs
- ADR-0001: Modular Monolith (billing module)
- ADR-0002: Tenant Isolation (billing scoped to tenant)
- ADR-0003: Hash Chain (billing events logged)

---

## Changelog
| Date | Author | Change |
|------|--------|--------|
| 2026-10-19 | Pedro Belentani | Initial decision |