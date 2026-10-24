import { and, eq } from "drizzle-orm";
import { site } from "@/config/site";
import { db, schema } from "@/db";
import { stripeClient } from "@/lib/payments/stripe-client";
import { startCheckout } from "@/lib/payments/stripe-flow";
import { guardJson, sessionFrom } from "@/lib/server/api";
import { createRateLimiter } from "@/lib/security/rate-limit";
import { jsonError } from "@/lib/security/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const limiter = createRateLimiter({ limit: 10, windowMs: 10 * 60_000 });

export async function POST(req: Request, ctx: { params: Promise<{ number: string }> }): Promise<Response> {
  const g = await guardJson(req, { limiter, maxBytes: 0, requireBody: false });
  if (!g.ok) return g.response;
  const session = await sessionFrom(req);
  if (!session) return jsonError(401, "unauthorized");
  const stripe = stripeClient();
  if (!stripe) return jsonError(503, "payments_disabled");

  const { number } = await ctx.params;
  if (!/^BBU-\d{6,}$/.test(number)) return jsonError(404, "not_found");
  const order = await db.query.orders.findFirst({ where: and(eq(schema.orders.number, number), eq(schema.orders.userId, session.user.id)) });
  if (!order) return jsonError(404, "not_found");

  const base = `${site.url}/${order.locale}/account/orders/${order.number}`;
  let r;
  try {
    r = await startCheckout(db, stripe, order, { success: `${base}?paid=1`, cancel: base });
  } catch (e) {
    console.error("stripe checkout failed", order.number, e instanceof Error ? e.message : e);
    return jsonError(502, "provider_unavailable");
  }
  if (!r.ok) return jsonError(409, r.reason);
  return Response.json({ ok: true, url: r.url }, { headers: { "cache-control": "no-store" } });
}
