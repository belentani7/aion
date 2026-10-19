import { describe, expect, it } from "vitest";
import { createPlanCheckoutSession, isStripeConfigured } from "./stripe.service";

describe("Stripe Checkout sandbox integration", () => {
  it.skipIf(!isStripeConfigured())("creates a real test Checkout Session with tenant metadata and idempotency", async () => {
    const session = await createPlanCheckoutSession({
      tenantId: 900001,
      userId: 900001,
      email: "integration-test@example.test",
      name: "AION Integration Test",
      plan: "pro",
      origin: "https://aionworkforc-ecghblau.manus.space",
      idempotencyKey: `aion-integration-${Date.now()}`,
    });

    expect(session.id).toMatch(/^cs_/);
    expect(session.url).toMatch(/^https:\/\/checkout\.stripe\.com\//);
    expect(session.metadata?.tenantId).toBe("900001");
    expect(session.metadata?.plan).toBe("pro");
  });
});
