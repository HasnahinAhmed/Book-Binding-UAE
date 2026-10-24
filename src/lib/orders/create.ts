/**
 * Creates an order from cart choices. Every price is recalculated here;
 * the browser never sends amounts. No payment is taken at this step.
 */
import { and, eq, inArray } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "@/db/schema";
import type { Quote } from "@/lib/pricing/quote";
import { serverQuote } from "@/lib/quote/server-quote";
import type { StoredFileMeta } from "@/lib/storage/types";
import { checkoutSchema } from "./checkout-schema";

type Db = PostgresJsDatabase<typeof schema>;

export type CreateOrderResult =
  | { ok: true; order: { id: string; number: string }; duplicate: boolean }
  | { ok: false; code: "invalid_input"; issues: { path: string; message: string }[] }
  | { ok: false; code: "item_invalid"; index: number; reason: string }
  | { ok: false; code: "price_unconfirmed"; index: number }
  | { ok: false; code: "upload_in_use"; index: number };

export async function createOrder(
  db: Db,
  customer: { id: string; email: string },
  raw: unknown,
  findUpload: (id: string) => Promise<StoredFileMeta | null>,
): Promise<CreateOrderResult> {
  const parsed = checkoutSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, code: "invalid_input", issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) };
  }
  const input = parsed.data;

  // Same checkout submitted twice (double click, retry): return the first order.
  const existing = await db.query.orders.findFirst({
    where: and(eq(schema.orders.userId, customer.id), eq(schema.orders.clientRequestId, input.requestId)),
    columns: { id: true, number: true },
  });
  if (existing) return { ok: true, order: existing, duplicate: true };

  const priced: { item: (typeof input.items)[number]; quote: Quote; upload: StoredFileMeta | null }[] = [];
  for (const [index, item] of input.items.entries()) {
    const q = await serverQuote(item.request, findUpload);
    if (!q.ok) return { ok: false, code: "item_invalid", index, reason: q.error.code };
    if (q.quote.hasUnconfirmedPrices) return { ok: false, code: "price_unconfirmed", index };
    const uploadId = item.request.printing?.uploadId ?? null;
    const upload = uploadId ? await findUpload(uploadId) : null;
    priced.push({ item, quote: q.quote, upload });
  }

  const uploadIds = priced.flatMap((p) => (p.upload ? [p.upload.id] : []));
  const seen = new Set<string>();
  for (const [index, p] of priced.entries()) {
    if (!p.upload) continue;
    if (seen.has(p.upload.id)) return { ok: false, code: "upload_in_use", index };
    seen.add(p.upload.id);
  }
  if (uploadIds.length) {
    const taken = await db.select({ id: schema.orderFiles.uploadId }).from(schema.orderFiles).where(inArray(schema.orderFiles.uploadId, uploadIds));
    if (taken.length) return { ok: false, code: "upload_in_use", index: priced.findIndex((p) => p.upload?.id === taken[0]!.id) };
  }

  const goodsSubtotal = priced.reduce((sum, p) => sum + p.quote.subtotal, 0);

  const order = await db.transaction(async (tx) => {
    const [o] = await tx
      .insert(schema.orders)
      .values({
        userId: customer.id,
        locale: input.locale,
        goodsSubtotal,
        deliveryFee: null,
        total: goodsSubtotal,
        contactName: input.contact.name,
        contactPhone: input.contact.phone,
        contactEmail: customer.email,
        fulfilment: input.fulfilment,
        emirate: input.fulfilment === "delivery" ? (input.emirate ?? null) : null,
        address: input.fulfilment === "delivery" ? (input.address ?? null) : null,
        customerNote: input.note || null,
        clientRequestId: input.requestId,
      })
      .returning({ id: schema.orders.id, number: schema.orders.number });
    const created = o!;

    await tx.insert(schema.orderItems).values(
      priced.map((p, position) => ({
        orderId: created.id,
        position,
        productId: p.quote.productId,
        quantity: p.quote.quantity,
        options: p.item.request,
        design: p.item.design ?? {},
        quote: p.quote,
        lineTotal: p.quote.subtotal,
        uploadId: p.upload?.id ?? null,
      })),
    );

    const files = priced.flatMap((p) => (p.upload ? [p.upload] : []));
    if (files.length) {
      await tx.insert(schema.orderFiles).values(
        files.map((f) => ({
          uploadId: f.id,
          orderId: created.id,
          originalName: f.originalName,
          pages: f.pages,
          sizeBytes: f.sizeBytes,
          sha256: f.sha256,
        })),
      );
    }

    await tx.insert(schema.orderEvents).values({ orderId: created.id, status: "submitted", actorId: customer.id });
    return created;
  });

  return { ok: true, order, duplicate: false };
}
