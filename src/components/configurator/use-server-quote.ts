"use client";

import { useEffect, useRef, useState } from "react";
import type { Quote } from "@/lib/pricing/quote";
import type { QuoteRequest } from "@/lib/quote/server-quote";

export type ServerQuoteState =
  | { status: "idle" | "loading" }
  | { status: "ok"; quote: Quote }
  | { status: "error"; code: string };

/** Asks the server for the authoritative price of the current choices. */
export function useServerQuote(req: QuoteRequest, enabled: boolean, onUploadMissing: () => void): ServerQuoteState {
  const body = JSON.stringify(req);
  const [result, setResult] = useState<{ body: string; state: ServerQuoteState } | null>(null);
  const missingRef = useRef(onUploadMissing);
  useEffect(() => {
    missingRef.current = onUploadMissing;
  });

  useEffect(() => {
    if (!enabled) return;
    const ac = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch("/api/quote", { method: "POST", headers: { "content-type": "application/json" }, body, signal: ac.signal });
        const json = (await res.json()) as { ok: boolean; quote?: Quote; error?: { code: string } };
        if (json.ok && json.quote) setResult({ body, state: { status: "ok", quote: json.quote } });
        else {
          const code = json.error?.code ?? "generic";
          if (code === "upload_not_found") missingRef.current();
          setResult({ body, state: { status: "error", code } });
        }
      } catch {
        if (!ac.signal.aborted) setResult({ body, state: { status: "error", code: "generic" } });
      }
    }, 250);
    return () => {
      window.clearTimeout(timer);
      ac.abort();
    };
  }, [body, enabled]);

  if (!enabled) return { status: "idle" };
  return result?.body === body ? result.state : { status: "loading" };
}
