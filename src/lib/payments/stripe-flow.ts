/**
 * Stripe Checkout flow. An order can be paid online only after staff have
 * confirmed it and set the delivery fee, so the amount is final. The order is
 * marked paid only from a signature-verified webhook whose amount matches.
 */
import { and, eq, inArray } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type Stripe from "stripe";
import * as schema from "@/db/schema";

type Db = PostgresJsDatabase<typeof schema>;
type Order = typeof schema.orders.$inferSelect;

const PAYABLE_STATUS = new Set(["confirmed", "in_production", "ready", "out_for_delivery"]);

export type PayableCheck = { ok: true } | { ok: false; reason: "not_confirmed" | "delivery_fee_missing" | "already_paid" | "closed" | "zero_total" };

export function isPayable(order: Pick<Order, "status" | "deliveryFee" | "paymentStatus" | "total">): PayableCheck {
  if (order.paymentStatus === "paid" || order.paymentStatus === "refunded") return { ok: false, reason: "already_paid" };
  if (order.status === "cancelled" || order.status === "completed") return { ok: false, reason: "closed" };
  if (!PAYABLE_STATUS.has(order.status)) return { ok: false, reason: "not_confirmed" };
  if (order.deliveryFee === null) return { ok: false, reason: "delivery_fee_missing" };
  if (order.total <= 0) return { ok: false, reason: "zero_total" };
  return { ok: true };
}

export type StripeLike = {
  checkout: {
    sessions: {
      create: (params: Stripe.Checkout.SessionCreateParams, opts?: Stripe.RequestOptions) => Promise<{ id: string; url: string | null }>;
      expire: (id: string) => Promise<unknown>;
    };
  };
};

export async function startCheckout(
  db: Db,
  stripe: StripeLike,
  order: Order,
  urls: { success: string; cancel: string },
): Promise<{ ok: true; url: string } | { ok: false; reason: string }> {
  const check = isPayable(order);
  if (!check.ok) return check;

  // Close earlier unfinished attempts so only one can be paid.
  const open = await db
    .select()
    .from(schema.payments)
    .where(and(eq(schema.payments.orderId, order.id), eq(schema.payments.status, "open")));
  for (const p of open) {
    try {
      await stripe.checkout.sessions.expire(p.providerRef);
    } catch {
      /* already expired or completed; the webhook settles it */
    }
  }

  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: { currency: "aed", unit_amount: order.total, product_data: { name: `Book Binding UAE order ${order.number}` } },
        },
      ],
      customer_email: order.contactEmail,
      client_reference_id: order.id,
      metadata: { orderId: order.id, orderNumber: order.number },
      payment_intent_data: { metadata: { orderId: order.id, orderNumber: order.number } },
      success_url: urls.success,
      cancel_url: urls.cancel,
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
      locale: "auto",
    },
    { idempotencyKey: `bbu-${order.id}-${order.total}-${open.length}` },
  );
  if (!session.url) return { ok: false, reason: "no_url" };

  await db.transaction(async (tx) => {
    await tx
      .insert(schema.payments)
      .values({ orderId: order.id, provider: "stripe", providerRef: session.id, amount: order.total, currency: "aed" })
      .onConflictDoNothing();
    await tx.update(schema.orders).set({ paymentStatus: "pending", updatedAt: new Date() }).where(eq(schema.orders.id, order.id));
  });
  return { ok: true, url: session.url };
}

type SessionLike = { id: string; payment_status: string; amount_total: number | null; currency: string | null };

export type WebhookOutcome = "duplicate" | "ignored" | "paid" | "amount_mismatch" | "failed" | "expired" | "unknown_session";

/** Applies a verified Stripe event. Runs in one transaction; Stripe retries if it throws. */
export async function handleStripeEvent(db: Db, event: { id: string; type: string; data: { object: unknown } }): Promise<WebhookOutcome> {
  const handled = ["checkout.session.completed", "checkout.session.async_payment_succeeded", "checkout.session.async_payment_failed", "checkout.session.expired"];
  if (!handled.includes(event.type)) return "ignored";
  const s = event.data.object as SessionLike;

  return db.transaction(async (tx) => {
    const fresh = await tx
      .insert(schema.webhookEvents)
      .values({ id: event.id, provider: "stripe", type: event.type })
      .onConflictDoNothing()
      .returning({ id: schema.webhookEvents.id });
    if (!fresh.length) return "duplicate" as const;

    const [payment] = await tx.select().from(schema.payments).where(eq(schema.payments.providerRef, s.id)).for("update");
    if (!payment) return "unknown_session" as const;
    const [order] = await tx.select().from(schema.orders).where(eq(schema.orders.id, payment.orderId)).for("update");
    const audit = (action: string, data: Record<string, unknown>) =>
      tx.insert(schema.auditLog).values({ action, entity: "order", entityId: payment.orderId, data: { provider: "stripe", session: s.id, event: event.id, ...data } });
    const setPayment = (status: "paid" | "failed" | "expired") =>
      tx.update(schema.payments).set({ status, updatedAt: new Date() }).where(eq(schema.payments.id, payment.id));

    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      if (s.payment_status !== "paid") return "ignored" as const; // async methods settle later
      if (s.amount_total !== payment.amount || (s.currency ?? "").toLowerCase() !== payment.currency || !order || order.total !== payment.amount) {
        await audit("payment.amount_mismatch", { expected: payment.amount, got: s.amount_total, currency: s.currency, orderTotal: order?.total });
        return "amount_mismatch" as const;
      }
      await setPayment("paid");
      await tx.update(schema.orders).set({ paymentStatus: "paid", updatedAt: new Date() }).where(eq(schema.orders.id, order.id));
      await tx.insert(schema.orderEvents).values({ orderId: order.id, note: "payment_received", public: true });
      await audit("payment.paid", { amount: payment.amount });
      return "paid" as const;
    }

    const status = event.type === "checkout.session.expired" ? "expired" : "failed";
    await setPayment(status);
    if (order && order.paymentStatus === "pending") {
      const stillOpen = await tx
        .select({ id: schema.payments.id })
        .from(schema.payments)
        .where(and(eq(schema.payments.orderId, order.id), inArray(schema.payments.status, ["open", "paid"])));
      if (!stillOpen.length) {
        await tx
          .update(schema.orders)
          .set({ paymentStatus: status === "failed" ? "failed" : "unpaid", updatedAt: new Date() })
          .where(eq(schema.orders.id, order.id));
      }
    }
    await audit(`payment.${status}`, {});
    return status;
  });
}
