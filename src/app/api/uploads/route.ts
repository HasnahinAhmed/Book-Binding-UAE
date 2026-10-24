import { serverEnv } from "@/lib/server/env";
import { createRateLimiter } from "@/lib/security/rate-limit";
import { BodyTooLargeError, clientIp, isSameOrigin, jsonError, readBodyLimited } from "@/lib/security/request";
import { privateStorage } from "@/lib/storage";
import { saveThesisPdf } from "@/lib/uploads/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 10 uploads per 10 minutes per visitor
const limiter = createRateLimiter({ limit: 10, windowMs: 10 * 60_000 });
// multipart framing adds a little on top of the file itself
const FORM_OVERHEAD = 64 * 1024;

export async function POST(req: Request): Promise<Response> {
  if (!isSameOrigin(req)) return jsonError(403, "forbidden");
  const rl = limiter.check(clientIp(req, serverEnv.trustProxy));
  if (!rl.ok) return jsonError(429, "rate_limited", { retryAfterSec: rl.retryAfterSec }, { "retry-after": String(rl.retryAfterSec) });

  const type = req.headers.get("content-type") ?? "";
  if (!type.startsWith("multipart/form-data")) return jsonError(415, "unsupported_media_type");

  let form: FormData;
  try {
    const body = await readBodyLimited(req, serverEnv.uploadMaxBytes + FORM_OVERHEAD);
    form = await new Response(body as BodyInit, { headers: { "content-type": type } }).formData();
  } catch (e) {
    if (e instanceof BodyTooLargeError) return jsonError(413, "too_large", { maxBytes: serverEnv.uploadMaxBytes });
    return jsonError(400, "bad_request");
  }

  const file = form.get("file");
  if (!(file instanceof File)) return jsonError(400, "missing_file");

  const result = await saveThesisPdf(
    privateStorage(),
    { name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) },
    serverEnv.uploadMaxBytes,
  );
  if (!result.ok) {
    const status = result.code === "too_large" ? 413 : 422;
    return jsonError(status, result.code, result.code === "too_large" ? { maxBytes: serverEnv.uploadMaxBytes } : undefined);
  }
  const { id, pages, sizeBytes, originalName } = result.meta;
  return Response.json({ ok: true, upload: { id, pages, sizeBytes, name: originalName } }, { status: 201, headers: { "cache-control": "no-store" } });
}
