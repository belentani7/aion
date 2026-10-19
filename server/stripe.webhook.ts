import type { Request, Response } from "express";
import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { getDb, insertAndFetch } from "./db";
import { tenants, webhookEvents, type InsertTenant } from "../drizzle/schema";
import { LedgerService } from "./ledger.service";

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const validPlans = new Set(["free", "pro", "enterprise"]);

function normalizePlan(value: unknown): "free" | "pro" | "enterprise" {
  return typeof value === "string" && validPlans.has(value) ? (value as "free" | "pro" | "enterprise") : "pro";
}

function readRawBody(req: Request): Buffer {
  if (Buffer.isBuffer(req.body)) return req.body;
  return Buffer.from(JSON.stringify(req.body ?? {}), "utf8");
}

/** Stripe endpoint. It must be registered with express.raw before express.json. */
export async function handleStripeWebhook(req: Request, res: Response) {
  const rawBody = readRawBody(req);
  try {
    JSON.parse(rawBody.toString("utf8"));
  } catch {
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  if (!stripe) return res.status(503).json({ error: "Stripe is not configured" });
  const signature = req.headers["stripe-signature"];
  if (typeof signature !== "string") return res.status(400).json({ error: "Missing Stripe signature" });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET ?? "");
  } catch (error) {
    console.error("[Stripe Webhook] Signature verification failed", error);
    return res.status(400).json({ error: "Invalid Stripe signature" });
  }

  const db = await getDb();
  if (!db) return res.status(503).json({ error: "Database not available" });

  try {
    const [processed] = await db.select().from(webhookEvents).where(eq(webhookEvents.id, event.id)).limit(1);
    if (processed) return res.json({ received: true, duplicate: true, eventId: event.id });
    await db.insert(webhookEvents).values({ id: event.id, type: event.type });

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = typeof session.customer === "string" ? session.customer : null;
        if (!customerId) break;
        const tenantName = session.metadata?.tenantName ?? `Empresa de ${session.customer_email ?? "Cliente"}`;
        const plan = normalizePlan(session.metadata?.plan);
        const [existing] = await db.select().from(tenants).where(eq(tenants.stripeCustomerId, customerId)).limit(1);
        const tenant = existing ?? await insertAndFetch(db, tenants, tenants.id, { name: tenantName, stripeCustomerId: customerId, plan } satisfies InsertTenant);
        if (existing) await db.update(tenants).set({ plan, updatedAt: new Date() }).where(eq(tenants.id, existing.id));
        await LedgerService.recordAuditEvent(tenant.id, "tenant_created", { stripeCustomerId: customerId, plan, stripeEventId: event.id });
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = typeof subscription.customer === "string" ? subscription.customer : null;
        if (!customerId) break;
        const [tenant] = await db.select().from(tenants).where(eq(tenants.stripeCustomerId, customerId)).limit(1);
        if (tenant) {
          const plan = normalizePlan(subscription.metadata?.plan ?? tenant.plan);
          await db.update(tenants).set({ plan, stripeSubscriptionId: subscription.id, updatedAt: new Date() }).where(eq(tenants.id, tenant.id));
          await LedgerService.recordAuditEvent(tenant.id, "plan_updated", { status: subscription.status, plan, subscriptionId: subscription.id, stripeEventId: event.id });
        }
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = typeof subscription.customer === "string" ? subscription.customer : null;
        if (!customerId) break;
        const [tenant] = await db.select().from(tenants).where(eq(tenants.stripeCustomerId, customerId)).limit(1);
        if (tenant) {
          await db.update(tenants).set({ plan: "free", stripeSubscriptionId: null, updatedAt: new Date() }).where(eq(tenants.id, tenant.id));
          await LedgerService.recordAuditEvent(tenant.id, "plan_updated", { plan: "free", reason: "subscription_deleted", stripeEventId: event.id });
        }
        break;
      }
      default:
        break;
    }

    return res.json({ received: true, eventId: event.id });
  } catch (error) {
    console.error("[Stripe Webhook Error]", error);
    return res.status(500).json({ error: "Webhook handler failed" });
  }
}
