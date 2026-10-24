import { count, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { savedStateSchema } from "@/lib/configurator/state";
import { guardJson, sessionFrom } from "@/lib/server/api";
import { createRateLimiter } from "@/lib/security/rate-limit";
import { jsonError } from "@/lib/security/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const limiter = createRateLimiter({ limit: 30, windowMs: 60_000 });
const MAX_DESIGNS = 50;
const bodySchema = z.object({ name: z.string().trim().min(1).max(80), state: savedStateSchema }).strict();

export async function POST(req: Request): Promise<Response> {
  const g = await guardJson(req, { limiter, maxBytes: 32 * 1024 });
  if (!g.ok) return g.response;
  const session = await sessionFrom(req);
  if (!session) return jsonError(401, "unauthorized");
  const parsed = bodySchema.safeParse(g.body);
  if (!parsed.success) return jsonError(422, "invalid_input");

  const [{ n }] = (await db.select({ n: count() }).from(schema.savedDesigns).where(eq(schema.savedDesigns.userId, session.user.id))) as [{ n: number }];
  if (n >= MAX_DESIGNS) return jsonError(409, "too_many_designs", { max: MAX_DESIGNS });

  const [row] = await db
    .insert(schema.savedDesigns)
    .values({ userId: session.user.id, name: parsed.data.name, state: parsed.data.state })
    .returning({ id: schema.savedDesigns.id });
  return Response.json({ ok: true, id: row!.id }, { status: 201, headers: { "cache-control": "no-store" } });
}
