/** Helpers for API route handlers. Framework-agnostic so they can be unit-tested. */

export function clientIp(req: Request, trustProxy: boolean): string {
  if (trustProxy) {
    const fwd = req.headers.get("x-forwarded-for");
    const first = fwd?.split(",")[0]?.trim();
    if (first) return first;
    const real = req.headers.get("x-real-ip")?.trim();
    if (real) return real;
  }
  return "local";
}

/**
 * Blocks cross-site form posts (CSRF). Browsers always send Origin on
 * cross-origin POSTs, so a missing Origin is only allowed for same-origin
 * fetch metadata or non-browser clients without cookies.
 */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") return false;
  if (!origin) return true;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export class BodyTooLargeError extends Error {
  constructor() {
    super("body_too_large");
  }
}

/** Reads the request body, stopping as soon as it passes maxBytes. */
export async function readBodyLimited(req: Request, maxBytes: number): Promise<Uint8Array> {
  const declared = Number(req.headers.get("content-length") ?? "NaN");
  if (Number.isFinite(declared) && declared > maxBytes) throw new BodyTooLargeError();
  if (!req.body) return new Uint8Array();
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new BodyTooLargeError();
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.byteLength;
  }
  return out;
}

export function jsonError(status: number, code: string, extra?: Record<string, unknown>, headers?: HeadersInit): Response {
  return Response.json({ ok: false, error: { code, ...extra } }, { status, headers: { "cache-control": "no-store", ...headers } });
}
