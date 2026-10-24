/**
 * Authoritative quote. The client sends choices only; the server decides the
 * page count (from the uploaded PDF when there is one) and every price.
 */
import { z } from "zod";
import { LIMITS } from "@/lib/pricing/catalog";
import { calculateQuote, quoteInputSchema, type Quote, type QuoteError } from "@/lib/pricing/quote";
import { FILE_ID_RE, type StoredFileMeta } from "@/lib/storage/types";

export const quoteRequestSchema = quoteInputSchema
  .extend({
    printing: z
      .object({
        pages: z.number().int().min(1).max(LIMITS.maxPages),
        paper: z.enum(["80gsm", "120gsm"]),
        mode: z.enum(["color", "bw"]),
        uploadId: z.string().regex(FILE_ID_RE).optional(),
      })
      .strict()
      .nullable()
      .default(null),
  })
  .strict();

export type QuoteRequest = z.input<typeof quoteRequestSchema>;

export type ServerQuoteResult =
  | { ok: true; quote: Quote }
  | { ok: false; error: QuoteError | { code: "upload_not_found" } };

export async function serverQuote(
  raw: unknown,
  findUpload: (id: string) => Promise<StoredFileMeta | null>,
): Promise<ServerQuoteResult> {
  const parsed = quoteRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: { code: "invalid_input", issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) } };
  }
  const { printing, ...rest } = parsed.data;
  let resolvedPrinting = null;
  if (printing) {
    const { uploadId, ...p } = printing;
    if (uploadId) {
      const meta = await findUpload(uploadId);
      if (!meta) return { ok: false, error: { code: "upload_not_found" } };
      resolvedPrinting = { ...p, pages: meta.pages, pageCountSource: "pdf" as const };
    } else {
      resolvedPrinting = { ...p, pageCountSource: "estimate" as const };
    }
  }
  return calculateQuote({ ...rest, printing: resolvedPrinting });
}
