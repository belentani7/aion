import Stripe from "stripe";

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

const planPricing = {
  pro: { unitAmount: 2900, name: "AION Workforce Pro" },
  enterprise: { unitAmount: 9900, name: "AION Workforce Enterprise" },
} as const;

export type PaidPlan = keyof typeof planPricing;

export function isStripeConfigured(): boolean {
  return Boolean(stripe);
}

export async function createPlanCheckoutSession(input: {
  tenantId: number;
  userId: number;
  email?: string | null;
  name?: string | null;
  plan: PaidPlan;
  origin: string;
  idempotencyKey: string;
}) {
  if (!stripe) throw new Error("Stripe is not configured");
  const pricing = planPricing[input.plan];
  return stripe.checkout.sessions.create({
    mode: "subscription",
    client_reference_id: String(input.userId),
    customer_email: input.email ?? undefined,
    allow_promotion_codes: true,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: "eur",
        unit_amount: pricing.unitAmount,
        recurring: { interval: "month" },
        product_data: { name: pricing.name },
      },
    }],
    metadata: {
      tenantId: String(input.tenantId),
      userId: String(input.userId),
      tenantName: input.name ?? "AION Workforce",
      plan: input.plan,
    },
    success_url: `${input.origin}/?billing=success&plan=${input.plan}`,
    cancel_url: `${input.origin}/?billing=cancelled`,
  }, { idempotencyKey: input.idempotencyKey });
}
