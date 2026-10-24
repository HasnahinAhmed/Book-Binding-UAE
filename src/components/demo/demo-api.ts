/**
 * Preview build only (GitHub Pages has no server). Answers the builder's and
 * cart's pricing calls in the browser with the same pricing code the server
 * uses, and reads a chosen PDF's page count locally. Nothing is uploaded.
 */
import { serverQuote } from "@/lib/quote/server-quote";
import type { StoredFileMeta } from "@/lib/storage/types";

const KEY = "bbu-preview-uploads";
const uploads = new Map<string, StoredFileMeta>();
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) for (const [k, v] of JSON.parse(raw) as [string, StoredFileMeta][]) uploads.set(k, v);
  } catch {}
}
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify([...uploads].slice(-20)));
  } catch {}
}
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const find = async (id: string) => uploads.get(id) ?? null;

export async function demoInspectPdf(file: File) {
  const { inspectPdf, safeDisplayName } = await import("@/lib/uploads/pdf");
  const check = await inspectPdf(new Uint8Array(await file.arrayBuffer()));
  if (!check.ok) return { ok: false as const, code: check.code };
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const id = btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const name = safeDisplayName(file.name);
  uploads.set(id, { id, pages: check.pages, sizeBytes: file.size, originalName: name } as unknown as StoredFileMeta);
  save();
  return { ok: true as const, upload: { id, pages: check.pages, sizeBytes: file.size, name } };
}

let installed = false;
export function installDemoApi() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  load();
  const real = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
    const path = url.startsWith("http") ? new URL(url).pathname : url;
    if (!path.startsWith("/api/")) return real(input, init);
    const body = init?.body && typeof init.body === "string" ? JSON.parse(init.body) : null;
    if (path === "/api/quote") {
      const r = await serverQuote(body, find);
      return r.ok ? json(200, { ok: true, quote: r.quote }) : json(422, { ok: false, error: r.error });
    }
    if (path === "/api/cart/price") {
      const lines = await Promise.all(((body?.items ?? []) as unknown[]).map((i) => serverQuote(i, find)));
      const subtotal = lines.every((l) => l.ok) ? lines.reduce((s, l) => s + (l.ok ? l.quote.subtotal : 0), 0) : null;
      return json(200, { ok: true, lines, subtotal });
    }
    if (path.startsWith("/api/uploads/")) return json(200, { ok: true });
    return json(503, { ok: false, error: { code: "preview" } });
  };
}
