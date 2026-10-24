/**
 * Staff actions on orders. Every change writes an order event (the customer's
 * timeline) and an audit-log entry in the same transaction.
 */
import { and, desc, eq, sql, type SQL } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { z } from "zod";
import * as schema from "@/db/schema";

type Db = PostgresJsDatabase<typeof schema>;
export type OrderStatus = (typeof schema.orderStatus.enumValues)[number];

/** Which status can follow which. Cancelled and completed are final. */
export const NEXT_STATUS: Record<OrderStatus, OrderStatus[]> = {
  submitted: ["confirmed", "cancelled"],
  confirmed: ["in_production", "cancelled"],
  in_production: ["ready", "cancelled"],
  ready: ["out_for_delivery", "completed", "cancelled"],
  out_for_delivery: ["completed", "ready"],
  completed: [],
  cancelled: [],
};

export const adminActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("status"), status: z.enum(schema.orderStatus.enumValues), note: z.string().trim().max(500).optional() }).strict(),
  z
    .object({
      action: z.literal("delivery_fee"),
      /** fils; 0 = free / collection */
      fee: z.number().int().min(0).max(100_000_00),
    })
    .strict(),
  z
    .object({
      action: z.literal("payment"),
      status: z.enum(["unpaid", "paid", "refunded"]),
      note: z.string().trim().min(2).max(500),
    })
    .strict(),
  z.object({ action: z.literal("note"), note: z.string().trim().min(1).max(1000), public: z.boolean() }).strict(),
]);
export type AdminAction = z.input<typeof adminActionSchema>;

export type AdminActionResult =
  | { ok: true }
  | { ok: false; code: "invalid_input" | "not_found" | "invalid_transition" | "final_state" };

export async function applyAdminAction(db: Db, actor: { id: string; ip?: string }, orderId: string, raw: unknown): Promise<AdminActionResult> {
  const parsed = adminActionSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, code: "invalid_input" };
  const a = parsed.data;

  return db.transaction(async (tx) => {
    // lock the row so two staff members can't race each other
    const [order] = await tx.select().from(schema.orders).where(eq(schema.orders.id, orderId)).for("update");
    if (!order) return { ok: false, code: "not_found" } as const;
    const audit = (action: string, data: Record<string, unknown>) =>
      tx.insert(schema.auditLog).values({ actorId: actor.id, action, entity: "order", entityId: order.id, data, ip: actor.ip ?? null });

    switch (a.action) {
      case "status": {
        if (!NEXT_STATUS[order.status].includes(a.status)) return { ok: false, code: "invalid_transition" } as const;
        await tx.update(schema.orders).set({ status: a.status, updatedAt: new Date() }).where(eq(schema.orders.id, order.id));
        await tx.insert(schema.orderEvents).values({ orderId: order.id, status: a.status, note: a.note || null, actorId: actor.id });
        await audit("order.status", { from: order.status, to: a.status });
        return { ok: true } as const;
      }
      case "delivery_fee": {
        if (order.status === "completed" || order.status === "cancelled") return { ok: false, code: "final_state" } as const;
        await tx
          .update(schema.orders)
          .set({ deliveryFee: a.fee, total: order.goodsSubtotal + a.fee, updatedAt: new Date() })
          .where(eq(schema.orders.id, order.id));
        await audit("order.delivery_fee", { from: order.deliveryFee, to: a.fee });
        return { ok: true } as const;
      }
      case "payment": {
        await tx.update(schema.orders).set({ paymentStatus: a.status, updatedAt: new Date() }).where(eq(schema.orders.id, order.id));
        await tx.insert(schema.orderEvents).values({ orderId: order.id, note: a.note, public: false, actorId: actor.id });
        await audit("order.payment_recorded", { from: order.paymentStatus, to: a.status, note: a.note });
        return { ok: true } as const;
      }
      case "note": {
        await tx.insert(schema.orderEvents).values({ orderId: order.id, note: a.note, public: a.public, actorId: actor.id });
        await audit("order.note", { public: a.public });
        return { ok: true } as const;
      }
    }
  });
}

export async function listOrdersForStaff(db: Db, opts: { status?: OrderStatus; q?: string; limit?: number }) {
  const where: SQL[] = [];
  if (opts.status) where.push(eq(schema.orders.status, opts.status));
  const q = opts.q?.trim();
  if (q) {
    const like = `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
    where.push(
      sql`(${schema.orders.number} ilike ${like} or ${schema.orders.contactName} ilike ${like} or ${schema.orders.contactPhone} ilike ${like} or ${schema.orders.contactEmail} ilike ${like})`,
    );
  }
  return db
    .select({
      id: schema.orders.id,
      number: schema.orders.number,
      status: schema.orders.status,
      paymentStatus: schema.orders.paymentStatus,
      total: schema.orders.total,
      deliveryFee: schema.orders.deliveryFee,
      contactName: schema.orders.contactName,
      contactPhone: schema.orders.contactPhone,
      fulfilment: schema.orders.fulfilment,
      emirate: schema.orders.emirate,
      createdAt: schema.orders.createdAt,
    })
    .from(schema.orders)
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(schema.orders.createdAt))
    .limit(Math.min(opts.limit ?? 100, 200));
}

export async function getOrderForStaff(db: Db, number: string) {
  if (!/^BBU-\d{6,}$/.test(number)) return null;
  const order = await db.query.orders.findFirst({ where: eq(schema.orders.number, number) });
  if (!order) return null;
  const [items, events, files, audit] = await Promise.all([
    db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, order.id)).orderBy(schema.orderItems.position),
    db
      .select({ id: schema.orderEvents.id, status: schema.orderEvents.status, note: schema.orderEvents.note, public: schema.orderEvents.public, createdAt: schema.orderEvents.createdAt, actor: schema.user.name })
      .from(schema.orderEvents)
      .leftJoin(schema.user, eq(schema.user.id, schema.orderEvents.actorId))
      .where(eq(schema.orderEvents.orderId, order.id))
      .orderBy(schema.orderEvents.createdAt),
    db.select().from(schema.orderFiles).where(eq(schema.orderFiles.orderId, order.id)),
    db
      .select({ action: schema.auditLog.action, data: schema.auditLog.data, createdAt: schema.auditLog.createdAt, actor: schema.user.name })
      .from(schema.auditLog)
      .leftJoin(schema.user, eq(schema.user.id, schema.auditLog.actorId))
      .where(and(eq(schema.auditLog.entity, "order"), eq(schema.auditLog.entityId, order.id)))
      .orderBy(desc(schema.auditLog.createdAt))
      .limit(50),
  ]);
  return { order, items, events, files, audit };
}
