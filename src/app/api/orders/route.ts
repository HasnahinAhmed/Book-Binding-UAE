import { db } from "@/db";
import { createOrder } from "@/lib/orders/create";
import { guardJson, sessionFrom } from "@/lib/server/api";
import { createRateLimiter } from "@/lib/security/rate-limit";
import { jsonError } from "@/lib/security/request";
import { privateStorage } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const limiter = createRateLimiter({ limit: 10, windowMs: 10 * 60_000 });

export async function POST(req: Request): Promise<Response> {
  const g = await guardJson(req, { limiter, maxBytes: 64 * 1024 });
  if (!g.ok) return g.response;
  const session = await sessionFrom(req);
  if (!session) return jsonError(401, "unauthorized");

  const storage = privateStorage();
  const result = await createOrder(db, { id: session.user.id, email: session.user.email }, g.body, (id) => storage.getMeta(id));
  if (!result.ok) return jsonError(422, result.code, result);
  return Response.json({ ok: true, order: result.order }, { status: result.duplicate ? 200 : 201, headers: { "cache-control": "no-store" } });
}
