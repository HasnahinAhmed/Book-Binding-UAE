import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { staffFrom } from "@/lib/server/api";
import { serverEnv } from "@/lib/server/env";
import { clientIp, jsonError } from "@/lib/security/request";
import { privateStorage } from "@/lib/storage";
import { FILE_ID_RE } from "@/lib/storage/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Staff download of a customer's PDF. Only files attached to an order; every download is logged. */
export async function GET(req: Request, ctx: { params: Promise<{ uploadId: string }> }): Promise<Response> {
  const staff = await staffFrom(req);
  if (!staff) return jsonError(404, "not_found");
  const { uploadId } = await ctx.params;
  if (!FILE_ID_RE.test(uploadId)) return jsonError(404, "not_found");
  const file = await db.query.orderFiles.findFirst({ where: eq(schema.orderFiles.uploadId, uploadId) });
  if (!file) return jsonError(404, "not_found");
  const bytes = await privateStorage().getBytes(uploadId);
  if (!bytes) return jsonError(404, "not_found");

  await db.insert(schema.auditLog).values({
    actorId: staff.user.id,
    action: "file.download",
    entity: "order",
    entityId: file.orderId,
    data: { uploadId },
    ip: clientIp(req, serverEnv.trustProxy),
  });

  const asciiName = file.originalName.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return new Response(bytes as BodyInit, {
    headers: {
      "content-type": "application/pdf",
      "content-length": String(bytes.byteLength),
      "content-disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(file.originalName)}`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
