import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import { testDb } from "../../../tests/support/test-db";
import { handleStripeEvent, isPayable, startCheckout, type StripeLike } from "./stripe-flow";

const t = testDb();

describe("isPayable", () => {
  const base = { status: "confirmed", deliveryFee: 0, paymentStatus: "unpaid", total: 100 } as const;
  it("needs a confirmed order with a delivery fee", () => {
    expect(isPayable(base)).toEqual({ ok: true });
    expect(isPayable({ ...base, status: "submitted" })).toMatchObject({ ok: false, reason: "not_confirmed" });
    expect(isPayable({ ...base, deliveryFee: null })).toMatchObject({ ok: false, reason: "delivery_fee_missing" });
    expect(isPayable({ ...base, paymentStatus: "paid" })).toMatchObject({ ok: false, reason: "already_paid" });
  });
});

describe("webhook signature", () => {
  it("rejects a forged or altered payload", () => {
    const stripe = new Stripe("sk_test_dummy");
    const secret = "whsec_test";
    const payload = JSON.stringify({ id: "evt_1", type: "checkout.session.completed", data: { object: {} } });
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret });
    expect(stripe.webhooks.constructEvent(payload, header, secret).id).toBe("evt_1");
    expect(() => stripe.webhooks.constructEvent(payload.replace("evt_1", "evt_2"), header, secret)).toThrow();
    expect(() => stripe.webhooks.constructEvent(payload, header, "whsec_other")).toThrow();
  });
});

describe.skipIf(!t)("Stripe checkout flow (database)", () => {
  const db = t?.db as NonNullable<typeof t>["db"];
  let order: typeof schema.orders.$inferSelect;
  const created: string[] = [];
  const expired: string[] = [];
  const fake: StripeLike = {
    checkout: {
      sessions: {
        create: async () => {
          const id = `cs_test_${created.length + 1}`;
          created.push(id);
          return { id, url: `https://checkout.stripe.test/${id}` };
        },
        expire: async (id) => {
          expired.push(id);
        },
      },
    },
  };
  const evt = (id: string, type: string, object: object) => ({ id, type, data: { object } });

  beforeAll(async () => {
    await t!.reset();
    await db.insert(schema.user).values({ id: "u1", name: "U", email: "u@example.com" });
    [order] = await db
      .insert(schema.orders)
      .values({
        userId: "u1", locale: "en", goodsSubtotal: 24000, deliveryFee: 2500, total: 26500, status: "confirmed",
        contactName: "U", contactPhone: "971501234567", contactEmail: "u@example.com", fulfilment: "delivery", clientRequestId: "r1",
      })
      .returning() as [typeof schema.orders.$inferSelect];
  });
  afterAll(() => t?.end());

  it("creates a session for the confirmed total and marks the order pending", async () => {
    const r = await startCheckout(db, fake, order, { success: "https://x/s", cancel: "https://x/c" });
    expect(r).toEqual({ ok: true, url: "https://checkout.stripe.test/cs_test_1" });
    const [o] = await db.select().from(schema.orders).where(eq(schema.orders.id, order.id));
    expect(o!.paymentStatus).toBe("pending");
  });

  it("expires the earlier session when the customer tries again", async () => {
    const [o] = await db.select().from(schema.orders).where(eq(schema.orders.id, order.id));
    await startCheckout(db, fake, o!, { success: "https://x/s", cancel: "https://x/c" });
    expect(expired).toEqual(["cs_test_1"]);
  });

  it("does not mark paid when the amount differs", async () => {
    const r = await handleStripeEvent(db, evt("evt_a", "checkout.session.completed", { id: "cs_test_2", payment_status: "paid", amount_total: 100, currency: "aed" }));
    expect(r).toBe("amount_mismatch");
    const [o] = await db.select().from(schema.orders).where(eq(schema.orders.id, order.id));
    expect(o!.paymentStatus).toBe("pending");
  });

  it("marks paid once, ignoring a re-delivered event", async () => {
    const e = evt("evt_b", "checkout.session.completed", { id: "cs_test_2", payment_status: "paid", amount_total: 26500, currency: "aed" });
    expect(await handleStripeEvent(db, e)).toBe("paid");
    expect(await handleStripeEvent(db, e)).toBe("duplicate");
    const [o] = await db.select().from(schema.orders).where(eq(schema.orders.id, order.id));
    expect(o!.paymentStatus).toBe("paid");
    const evts = await db.select().from(schema.orderEvents).where(eq(schema.orderEvents.orderId, order.id));
    expect(evts.filter((x) => x.note === "payment_received")).toHaveLength(1);
  });

  it("keeps a paid order paid when an old session expires", async () => {
    expect(await handleStripeEvent(db, evt("evt_c", "checkout.session.expired", { id: "cs_test_1", payment_status: "unpaid", amount_total: 26500, currency: "aed" }))).toBe("expired");
    const [o] = await db.select().from(schema.orders).where(eq(schema.orders.id, order.id));
    expect(o!.paymentStatus).toBe("paid");
    const [o2] = await db.select().from(schema.orders).where(eq(schema.orders.id, order.id));
    expect((await startCheckout(db, fake, o2!, { success: "s", cancel: "c" })).ok).toBe(false);
  });
});
