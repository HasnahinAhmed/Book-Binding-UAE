import { PDFDocument } from "pdf-lib";
import { LIMITS } from "@/lib/pricing/catalog";

export type PdfCheck =
  | { ok: true; pages: number }
  | { ok: false; code: "not_pdf" | "encrypted" | "unreadable" | "no_pages" | "too_many_pages" };

const MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d]; // "%PDF-"

/** Checks the file really is a PDF (by its bytes, not its name) and counts pages. */
export async function inspectPdf(bytes: Uint8Array): Promise<PdfCheck> {
  if (bytes.byteLength < 64 || !MAGIC.every((b, i) => bytes[i] === b)) return { ok: false, code: "not_pdf" };
  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(bytes, { updateMetadata: false, throwOnInvalidObject: false });
  } catch (e) {
    if (e instanceof Error && /encrypt/i.test(e.message)) return { ok: false, code: "encrypted" };
    return { ok: false, code: "unreadable" };
  }
  if (doc.isEncrypted) return { ok: false, code: "encrypted" };
  let pages: number;
  try {
    pages = doc.getPageCount();
  } catch {
    return { ok: false, code: "unreadable" };
  }
  if (pages < 1) return { ok: false, code: "no_pages" };
  if (pages > LIMITS.maxPages) return { ok: false, code: "too_many_pages" };
  return { ok: true, pages };
}

/** Keeps a readable file name for staff without allowing paths or control characters. */
export function safeDisplayName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const cleaned = base
    .normalize("NFC")
    .replace(/[\u0000-\u001f\u007f<>:"|?*]/g, "")
    .trim()
    .slice(0, 120);
  return cleaned || "document.pdf";
}
