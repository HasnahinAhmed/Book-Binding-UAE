/**
 * Integration tests against a real Postgres database.
 * Set TEST_DATABASE_URL to run them; they are skipped otherwise.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { eq, sql } from "drizzle-orm";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import type { StoredFileMeta } from "@/lib/storage/types";
import { normalisePhone } from "./checkout-schema";
import { createOrder } from "./create";
import { getOrderForUser, listOrdersForUser } from "./queries";
import { applyAdminAction, getOrderForStaff, listOrdersForStaff } from "@/lib/admin/orders";

const url = process.env.TEST_DATABASE_URL;
const client = url ? postgres(url, { max: 2, onnotice: () => {} }) : null;
const db = client ? drizzle({ client, schema }) : null;

const upload: StoredFileMeta = {
  id: "UUUUUUUUUUUUUUUUUUUUUU",
  kind: "thesis-pdf",
  contentType: "application/pdf",
  sizeBytes: 5000,
  sha256: "abc",
  pages: 100,
  originalName: "thesis.pdf",
  createdAt: new Date().toISOString(),
};
const findUpload = async (id: string) => (id === upload.id ? upload : null);
const alice = { id: "user-alice", email: "alice@example.com" };
const bob = { id: "user-bob", email: "bob@example.com" };

const checkout = (over: Record<string, unknown> = {}) => ({
  requestId: "req-0000000000000001",
  locale: "en",
  items: [
    {
      request: {
        productId: "regular",
        quantity: 2,
        coverColorId: "black",
        foilTone: "gold",
        printing: { pages: 3, paper: "80gsm", mode: "bw", uploadId: upload.id },
      },
      design: { language: "both", direction: "auto", text: { title: "My thesis", titleAr: "رسالتي" }, hasLogo: false },
    },
  ],
  contact: { name: "Alice", phone: "050 123 4567" },
  fulfilment: "collection",
  ...over,
});

describe("normalisePhone", () => {
  it("accepts UAE and international formats", () => {
    expect(normalisePhone("050 123 4567")).toBe("971501234567");
    expect(normalisePhone("+971 50 123 4567")).toBe("971501234567");
    expect(normalisePhone("00971501234567")).toBe("971501234567");
    expect(normalisePhone("+44 20 7946 0958")).toBe("442079460958");
    expect(normalisePhone("12")).toBeNull();
  });
});

describe.skipIf(!db)("createOrder (database)", () => {
  beforeAll(async () => {
    await db!.execute(sql`DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; DROP SCHEMA IF EXISTS drizzle CASCADE;`);
    await migrate(db!, { migrationsFolder: "./drizzle" });
    await db!.insert(schema.user).values([
      { id: alice.id, name: "Alice", email: alice.email },
      { id: bob.id, name: "Bob", email: bob.email },
    ]);
  });
  afterAll(async () => {
    await client?.end();
  });

  it("creates an order priced on the server with the PDF page count", async () => {
    const r = await createOrder(db!, alice, checkout(), findUpload);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.order.number).toMatch(/^BBU-\d{6}$/);
    const full = await getOrderForUser(db!, alice.id, r.order.number);
    // 2 × AED 100 cover + 2 × 100 pages × AED 0.20 = AED 240
    expect(full?.order.goodsSubtotal).toBe(24000);
    expect(full?.order.deliveryFee).toBeNull();
    expect(full?.order.contactPhone).toBe("971501234567");
    expect(full?.order.contactEmail).toBe(alice.email);
    expect(full?.items).toHaveLength(1);
    expect(full?.files[0]?.pages).toBe(100);
    expect(full?.events.map((e) => e.status)).toEqual(["submitted"]);
  });

  it("returns the same order when the checkout is submitted twice", async () => {
    const r = await createOrder(db!, alice, checkout(), findUpload);
    expect(r.ok && r.duplicate).toBe(true);
    expect(await listOrdersForUser(db!, alice.id)).toHaveLength(1);
  });

  it("refuses to attach a file that already belongs to an order", async () => {
    const r = await createOrder(db!, bob, checkout({ requestId: "req-0000000000000002" }), findUpload);
    expect(r).toMatchObject({ ok: false, code: "upload_in_use" });
  });

  it("does not show one customer's order to another", async () => {
    const [o] = await db!.select().from(schema.orders).where(eq(schema.orders.userId, alice.id));
    expect(await getOrderForUser(db!, bob.id, o!.number)).toBeNull();
  });

  it("rejects totals sent by the client and incomplete delivery details", async () => {
    const withTotal = checkout({ requestId: "req-0000000000000003", total: 1 });
    expect((await createOrder(db!, bob, withTotal, findUpload)).ok).toBe(false);
    const noAddress = checkout({ requestId: "req-0000000000000004", fulfilment: "delivery", emirate: "dubai" });
    expect(await createOrder(db!, bob, noAddress, findUpload)).toMatchObject({ ok: false, code: "invalid_input" });
  });

  it("enforces product minimums on the server", async () => {
    const leather = checkout({
      requestId: "req-0000000000000005",
      items: [{ request: { productId: "leather", quantity: 1, coverColorId: "acero", foilTone: "gold" }, design: null }],
    });
    expect(await createOrder(db!, bob, leather, findUpload)).toMatchObject({ ok: false, code: "item_invalid" });
  });

  it("staff move an order forward, set delivery and record payment, with audit trail", async () => {
    const [o] = await db!.select().from(schema.orders).where(eq(schema.orders.userId, alice.id));
    const staff = { id: bob.id };
    expect(await applyAdminAction(db!, staff, o!.id, { action: "status", status: "completed" })).toEqual({ ok: false, code: "invalid_transition" });
    expect(await applyAdminAction(db!, staff, o!.id, { action: "status", status: "confirmed", note: "Cover text checked" })).toEqual({ ok: true });
    expect(await applyAdminAction(db!, staff, o!.id, { action: "delivery_fee", fee: 2500 })).toEqual({ ok: true });
    expect(await applyAdminAction(db!, staff, o!.id, { action: "payment", status: "paid", note: "Bank transfer ref 123" })).toEqual({ ok: true });
    expect(await applyAdminAction(db!, staff, o!.id, { action: "payment", status: "paid" })).toEqual({ ok: false, code: "invalid_input" });

    const full = await getOrderForStaff(db!, o!.number);
    expect(full?.order.total).toBe(24000 + 2500);
    expect(full?.order.paymentStatus).toBe("paid");
    expect(full?.audit.map((a) => a.action).sort()).toEqual(["order.delivery_fee", "order.payment_recorded", "order.status"]);
    // the payment note is internal: customers only see public events
    const customerView = await getOrderForUser(db!, alice.id, o!.number);
    expect(customerView?.events.map((e) => e.status)).toEqual(["submitted", "confirmed"]);
    expect(customerView?.events.some((e) => e.note?.includes("Bank"))).toBe(false);
  });

  it("searches orders safely", async () => {
    expect(await listOrdersForStaff(db!, { q: "alice@" })).toHaveLength(1);
    expect(await listOrdersForStaff(db!, { q: "%" })).toHaveLength(0);
    expect(await listOrdersForStaff(db!, { status: "confirmed" })).toHaveLength(1);
  });
});
