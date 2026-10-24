import { mkdtemp, readdir, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createLocalStorage } from "@/lib/storage/local";
import { inspectPdf, safeDisplayName } from "./pdf";
import { saveThesisPdf } from "./service";

async function makePdf(pages: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) doc.addPage([595, 842]);
  return doc.save();
}

let dir: string;
beforeAll(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "bbu-upl-"));
});
afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("inspectPdf", () => {
  it("counts pages of a real PDF", async () => {
    expect(await inspectPdf(await makePdf(7))).toEqual({ ok: true, pages: 7 });
  });
  it("rejects a PNG renamed to .pdf", async () => {
    const png = new Uint8Array(200);
    png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(await inspectPdf(png)).toEqual({ ok: false, code: "not_pdf" });
  });
  it("rejects garbage that starts with %PDF-", async () => {
    const bytes = new TextEncoder().encode("%PDF-1.7\n" + "x".repeat(200));
    const r = await inspectPdf(bytes);
    expect(r.ok).toBe(false);
  });
});

describe("safeDisplayName", () => {
  it("strips paths and control characters", () => {
    expect(safeDisplayName("../../etc/passwd")).toBe("passwd");
    expect(safeDisplayName("C:\\Users\\a\\thesis\u0000.pdf")).toBe("thesis.pdf");
    expect(safeDisplayName("")).toBe("document.pdf");
    expect(safeDisplayName("رسالة الماجستير.pdf")).toBe("رسالة الماجستير.pdf");
  });
});

describe("saveThesisPdf + local storage", () => {
  it("stores the file privately with a random id and server page count", async () => {
    const storage = createLocalStorage(dir);
    const r = await saveThesisPdf(storage, { name: "my thesis.pdf", bytes: await makePdf(3) }, 1024 * 1024);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.meta.id).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(r.meta.pages).toBe(3);
    expect(await storage.getMeta(r.meta.id)).toEqual(r.meta);
    const files = await readdir(path.join(dir, "uploads"));
    expect(files).toContain(`${r.meta.id}.pdf`);
    const mode = (await stat(path.join(dir, "uploads", `${r.meta.id}.pdf`))).mode & 0o777;
    expect(mode).toBe(0o600);
  });
  it("rejects oversized and empty files before parsing", async () => {
    const storage = createLocalStorage(dir);
    expect(await saveThesisPdf(storage, { name: "a.pdf", bytes: new Uint8Array() }, 100)).toEqual({ ok: false, code: "empty" });
    expect(await saveThesisPdf(storage, { name: "a.pdf", bytes: await makePdf(1) }, 10)).toEqual({ ok: false, code: "too_large" });
  });
  it("never resolves ids that could escape the folder", async () => {
    const storage = createLocalStorage(dir);
    expect(await storage.getMeta("../../etc/passwd")).toBeNull();
    expect(await storage.getMeta("aaaaaaaaaaaaaaaaaaaaa/")).toBeNull();
  });
});
