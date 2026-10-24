import { describe, expect, it } from "vitest";
import type { StoredFileMeta } from "@/lib/storage/types";
import { serverQuote } from "./server-quote";

const UPLOAD: StoredFileMeta = {
  id: "AAAAAAAAAAAAAAAAAAAAAA",
  kind: "thesis-pdf",
  contentType: "application/pdf",
  sizeBytes: 1000,
  sha256: "x",
  pages: 200,
  originalName: "t.pdf",
  createdAt: "2026-10-24T00:00:00Z",
};
const find = async (id: string) => (id === UPLOAD.id ? UPLOAD : null);
const base = { productId: "regular", quantity: 1, coverColorId: "black", foilTone: "gold" } as const;

describe("serverQuote", () => {
  it("uses the uploaded PDF's page count, not the client's", async () => {
    const r = await serverQuote({ ...base, printing: { pages: 5, paper: "80gsm", mode: "bw", uploadId: UPLOAD.id } }, find);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const printing = r.quote.lines.find((l) => l.kind === "printing");
    expect(printing?.pages).toBe(200);
    expect(r.quote.pageCountIsEstimate).toBe(false);
    // 120 cover + 200 × 0.20
    expect(r.quote.subtotal).toBe(16000);
  });
  it("treats pages without an upload as an estimate", async () => {
    const r = await serverQuote({ ...base, printing: { pages: 50, paper: "80gsm", mode: "bw" } }, find);
    expect(r.ok && r.quote.pageCountIsEstimate).toBe(true);
  });
  it("refuses a client that claims pageCountSource or sends a total", async () => {
    const forged = await serverQuote({ ...base, printing: { pages: 5, paper: "80gsm", mode: "bw", pageCountSource: "pdf" } }, find);
    expect(forged.ok).toBe(false);
    const total = await serverQuote({ ...base, subtotal: 1 }, find);
    expect(total.ok).toBe(false);
  });
  it("reports an unknown upload", async () => {
    const r = await serverQuote({ ...base, printing: { pages: 5, paper: "80gsm", mode: "bw", uploadId: "BBBBBBBBBBBBBBBBBBBBBB" } }, find);
    expect(r).toEqual({ ok: false, error: { code: "upload_not_found" } });
  });
});
