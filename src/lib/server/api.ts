import "server-only";
import { auth, roleOf } from "@/lib/auth";
import { serverEnv } from "@/lib/server/env";
import type { RateLimiter } from "@/lib/security/rate-limit";
import { BodyTooLargeError, clientIp, isSameOrigin, jsonError, readBodyLimited } from "@/lib/security/request";

/** Common guard for JSON POST/DELETE routes: same-origin, rate limit, size cap, JSON parse. */
export async function guardJson(
  req: Request,
  opts: { limiter: RateLimiter; maxBytes: number; requireBody?: boolean },
): Promise<{ ok: true; body: unknown } | { ok: false; response: Response }> {
  if (!isSameOrigin(req)) return { ok: false, response: jsonError(403, "forbidden") };
  const rl = opts.limiter.check(clientIp(req, serverEnv.trustProxy));
  if (!rl.ok) {
    return { ok: false, response: jsonError(429, "rate_limited", { retryAfterSec: rl.retryAfterSec }, { "retry-after": String(rl.retryAfterSec) }) };
  }
  if (opts.requireBody === false) return { ok: true, body: null };
  if (!(req.headers.get("content-type") ?? "").startsWith("application/json")) {
    return { ok: false, response: jsonError(415, "unsupported_media_type") };
  }
  try {
    return { ok: true, body: JSON.parse(new TextDecoder().decode(await readBodyLimited(req, opts.maxBytes))) };
  } catch (e) {
    return { ok: false, response: e instanceof BodyTooLargeError ? jsonError(413, "too_large") : jsonError(400, "bad_json") };
  }
}

export async function sessionFrom(req: Request) {
  return auth.api.getSession({ headers: req.headers });
}

/** Session of a staff or admin user, or null. */
export async function staffFrom(req: Request) {
  const session = await sessionFrom(req);
  const role = roleOf(session);
  return session && (role === "staff" || role === "admin") ? session : null;
}
