import { serverQuote } from "@/lib/quote/server-quote";
import { serverEnv } from "@/lib/server/env";
import { createRateLimiter } from "@/lib/security/rate-limit";
import { BodyTooLargeError, clientIp, isSameOrigin, jsonError, readBodyLimited } from "@/lib/security/request";
import { privateStorage } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const limiter = createRateLimiter({ limit: 120, windowMs: 60_000 });

export async function POST(req: Request): Promise<Response> {
  if (!isSameOrigin(req)) return jsonError(403, "forbidden");
  const rl = limiter.check(clientIp(req, serverEnv.trustProxy));
  if (!rl.ok) return jsonError(429, "rate_limited", { retryAfterSec: rl.retryAfterSec }, { "retry-after": String(rl.retryAfterSec) });
  if (!(req.headers.get("content-type") ?? "").startsWith("application/json")) return jsonError(415, "unsupported_media_type");

  let raw: unknown;
  try {
    raw = JSON.parse(new TextDecoder().decode(await readBodyLimited(req, 8 * 1024)));
  } catch (e) {
    return jsonError(e instanceof BodyTooLargeError ? 413 : 400, e instanceof BodyTooLargeError ? "too_large" : "bad_json");
  }

  const storage = privateStorage();
  const result = await serverQuote(raw, (id) => storage.getMeta(id));
  if (!result.ok) return jsonError(result.error.code === "upload_not_found" ? 404 : 422, result.error.code, result.error);
  return Response.json({ ok: true, quote: result.quote }, { headers: { "cache-control": "no-store" } });
}
