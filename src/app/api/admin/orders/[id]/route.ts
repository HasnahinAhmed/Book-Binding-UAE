import { db } from "@/db";
import { applyAdminAction } from "@/lib/admin/orders";
import { guardJson, staffFrom } from "@/lib/server/api";
import { serverEnv } from "@/lib/server/env";
import { createRateLimiter } from "@/lib/security/rate-limit";
import { clientIp, jsonError } from "@/lib/security/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const limiter = createRateLimiter({ limit: 120, windowMs: 60_000 });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const g = await guardJson(req, { limiter, maxBytes: 8 * 1024 });
  if (!g.ok) return g.response;
  const staff = await staffFrom(req);
  if (!staff) return jsonError(404, "not_found");
  const { id } = await ctx.params;
  if (!UUID.test(id)) return jsonError(404, "not_found");
  const r = await applyAdminAction(db, { id: staff.user.id, ip: clientIp(req, serverEnv.trustProxy) }, id, g.body);
  if (!r.ok) return jsonError(r.code === "not_found" ? 404 : 422, r.code);
  return Response.json({ ok: true }, { headers: { "cache-control": "no-store" } });
}
