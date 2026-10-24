import { and, asc, desc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "@/db/schema";

type Db = PostgresJsDatabase<typeof schema>;

export async function listOrdersForUser(db: Db, userId: string) {
  return db
    .select({
      id: schema.orders.id,
      number: schema.orders.number,
      status: schema.orders.status,
      paymentStatus: schema.orders.paymentStatus,
      total: schema.orders.total,
      deliveryFee: schema.orders.deliveryFee,
      createdAt: schema.orders.createdAt,
    })
    .from(schema.orders)
    .where(eq(schema.orders.userId, userId))
    .orderBy(desc(schema.orders.createdAt))
    .limit(100);
}

/** Only returns the order when it belongs to this user. */
export async function getOrderForUser(db: Db, userId: string, number: string) {
  if (!/^BBU-\d{6,}$/.test(number)) return null;
  const order = await db.query.orders.findFirst({
    where: and(eq(schema.orders.number, number), eq(schema.orders.userId, userId)),
  });
  if (!order) return null;
  const [items, events, files] = await Promise.all([
    db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, order.id)).orderBy(asc(schema.orderItems.position)),
    db
      .select({ status: schema.orderEvents.status, note: schema.orderEvents.note, createdAt: schema.orderEvents.createdAt })
      .from(schema.orderEvents)
      .where(and(eq(schema.orderEvents.orderId, order.id), eq(schema.orderEvents.public, true)))
      .orderBy(asc(schema.orderEvents.createdAt)),
    db
      .select({ uploadId: schema.orderFiles.uploadId, originalName: schema.orderFiles.originalName, pages: schema.orderFiles.pages })
      .from(schema.orderFiles)
      .where(eq(schema.orderFiles.orderId, order.id)),
  ]);
  return { order, items, events, files };
}
