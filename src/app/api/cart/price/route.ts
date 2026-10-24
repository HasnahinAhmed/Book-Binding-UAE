import { z } from "zod";
import { MAX_CART_ITEMS } from "@/lib/cart/schema";
import { serverQuote } from "@/lib/quote/server-quote";
import { guardJson } from "@/lib/server/api";
import { createRateLimiter } from "@/lib/security/rate-limit";
import { jsonError } from "@/lib/security/request";
import { privateStorage } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const limiter = createRateLimiter({ limit: 60, windowMs: 60_000 });
const bodySchema = z.object({ items: z.array(z.unknown()).min(1).max(MAX_CART_ITEMS) }).strict();

/** Prices every cart line on the server. Each line succeeds or fails on its own. */
export async function POST(req: Request): Promise<Response> {
  const g = await guardJson(req, { limiter, maxBytes: 64 * 1024 });
  if (!g.ok) return g.response;
  const parsed = bodySchema.safeParse(g.body);
  if (!parsed.success) return jsonError(422, "invalid_input");
  const storage = privateStorage();
  const lines = await Promise.all(parsed.data.items.map((item) => serverQuote(item, (id) => storage.getMeta(id))));
  const subtotal = lines.every((l) => l.ok) ? lines.reduce((s, l) => s + (l.ok ? l.quote.subtotal : 0), 0) : null;
  return Response.json({ ok: true, lines, subtotal }, { headers: { "cache-control": "no-store" } });
}
