import { isSameOrigin, jsonError } from "@/lib/security/request";
import { privateStorage } from "@/lib/storage";
import { FILE_ID_RE } from "@/lib/storage/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Lets the visitor who uploaded a file remove it. The 128-bit random id is
 * the only handle to the file and is never listed anywhere public.
 * Files already attached to an order cannot be removed this way (Milestone 7).
 */
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  if (!isSameOrigin(req)) return jsonError(403, "forbidden");
  const { id } = await ctx.params;
  if (!FILE_ID_RE.test(id)) return jsonError(404, "not_found");
  await privateStorage().delete(id);
  return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
}
