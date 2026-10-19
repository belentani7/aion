import { beforeEach, describe, expect, it, vi } from "vitest";

const { constructEvent } = vi.hoisted(() => ({ constructEvent: vi.fn() }));

vi.mock("stripe", () => ({
  default: class MockStripe {
    webhooks = { constructEvent };
  },
}));

vi.mock("./db", () => ({
  getDb: vi.fn(async () => null),
  insertAndFetch: vi.fn(),
}));

vi.mock("./ledger.service", () => ({
  LedgerService: { recordAuditEvent: vi.fn() },
}));

function responseMock() {
  return {
    statusCode: 200,
    status(code: number) { this.statusCode = code; return this; },
    json(payload: unknown) { return payload; },
  } as any;
}

describe("Stripe webhook", () => {
  beforeEach(() => {
    vi.resetModules();
    constructEvent.mockReset();
    process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_dummy";
  });

  it("rejects a managed test event that has no signature (no bypass)", async () => {
    const { handleStripeWebhook } = await import("./stripe.webhook");
    const res = responseMock();
    const result = await handleStripeWebhook(
      { body: Buffer.from(JSON.stringify({ id: "evt_test_aion", type: "test" })), headers: {} } as any,
      res
    );
    expect(res.statusCode).toBe(400);
    expect(result).toEqual({ error: "Missing Stripe signature" });
    expect(constructEvent).not.toHaveBeenCalled();
  });

  it("rejects events whose signature fails verification", async () => {
    constructEvent.mockImplementation(() => { throw new Error("bad signature"); });
    const { handleStripeWebhook } = await import("./stripe.webhook");
    const res = responseMock();
    const result = await handleStripeWebhook(
      { body: Buffer.from(JSON.stringify({ id: "evt_live_aion", type: "test" })), headers: { "stripe-signature": "t=1,v1=deadbeef" } } as any,
      res
    );
    expect(res.statusCode).toBe(400);
    expect(result).toEqual({ error: "Invalid Stripe signature" });
  });

  it("verifies the signature with the raw body and configured secret", async () => {
    constructEvent.mockReturnValue({ id: "evt_live_aion", type: "customer.subscription.deleted", data: { object: {} } });
    const { handleStripeWebhook } = await import("./stripe.webhook");
    const rawBody = Buffer.from(JSON.stringify({ id: "evt_live_aion", type: "customer.subscription.deleted" }));
    const res = responseMock();
    await handleStripeWebhook(
      { body: rawBody, headers: { "stripe-signature": "t=1,v1=abc" } } as any,
      res
    );
    expect(constructEvent).toHaveBeenCalledTimes(1);
    const [bodyArg, sigArg, secretArg] = constructEvent.mock.calls[0];
    expect(Buffer.isBuffer(bodyArg)).toBe(true);
    expect(bodyArg.equals(rawBody)).toBe(true);
    expect(sigArg).toBe("t=1,v1=abc");
    expect(secretArg).toBe("whsec_dummy");
    expect(res.statusCode).toBe(503);
  });
});
