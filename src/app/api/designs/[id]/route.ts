import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { guardJson, sessionFrom } from "@/lib/server/api";
import { createRateLimiter } from "@/lib/security/rate-limit";
import { jsonError } from "@/lib/security/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const limiter = createRateLimiter({ limit: 60, windowMs: 60_000 });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Owned = { ok: false; error: Response } | { ok: true; where: ReturnType<typeof and> };

async function owned(req: Request, id: string): Promise<Owned> {
  const session = await sessionFrom(req);
  if (!session) return { ok: false, error: jsonError(401, "unauthorized") };
  if (!UUID.test(id)) return { ok: false, error: jsonError(404, "not_found") };
  return { ok: true, where: and(eq(schema.savedDesigns.id, id), eq(schema.savedDesigns.userId, session.user.id)) };
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const o = await owned(req, (await ctx.params).id);
  if (!o.ok) return o.error;
  const row = await db.query.savedDesigns.findFirst({ where: o.where, columns: { id: true, name: true, state: true } });
  if (!row) return jsonError(404, "not_found");
  return Response.json({ ok: true, design: row }, { headers: { "cache-control": "no-store" } });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const g = await guardJson(req, { limiter, maxBytes: 0, requireBody: false });
  if (!g.ok) return g.response;
  const o = await owned(req, (await ctx.params).id);
  if (!o.ok) return o.error;
  await db.delete(schema.savedDesigns).where(o.where);
  return new Response(null, { status: 204 });
}
