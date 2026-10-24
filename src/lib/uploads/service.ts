import { createHash, randomBytes } from "node:crypto";
import type { PrivateStorage, StoredFileMeta } from "@/lib/storage/types";
import { inspectPdf, safeDisplayName, type PdfCheck } from "./pdf";

export type SaveUploadResult =
  | { ok: true; meta: StoredFileMeta }
  | { ok: false; code: Extract<PdfCheck, { ok: false }>["code"] | "empty" | "too_large" };

export async function saveThesisPdf(
  storage: PrivateStorage,
  file: { name: string; bytes: Uint8Array },
  maxBytes: number,
): Promise<SaveUploadResult> {
  if (file.bytes.byteLength === 0) return { ok: false, code: "empty" };
  if (file.bytes.byteLength > maxBytes) return { ok: false, code: "too_large" };
  const check = await inspectPdf(file.bytes);
  if (!check.ok) return { ok: false, code: check.code };
  const meta: StoredFileMeta = {
    id: randomBytes(16).toString("base64url"),
    kind: "thesis-pdf",
    contentType: "application/pdf",
    sizeBytes: file.bytes.byteLength,
    sha256: createHash("sha256").update(file.bytes).digest("hex"),
    pages: check.pages,
    originalName: safeDisplayName(file.name),
    createdAt: new Date().toISOString(),
  };
  await storage.put(meta, file.bytes);
  return { ok: true, meta };
}
