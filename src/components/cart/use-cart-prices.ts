"use client";

import { useEffect, useState } from "react";
import type { CartItem } from "@/lib/cart/schema";
import type { ServerQuoteResult } from "@/lib/quote/server-quote";

export type CartPrices = { status: "loading" } | { status: "error" } | { status: "ok"; lines: ServerQuoteResult[]; subtotal: number | null };

/** Server prices for every cart line. Re-runs when the cart changes. */
export function useCartPrices(items: CartItem[]): CartPrices {
  const body = JSON.stringify({ items: items.map((i) => i.request) });
  const [state, setState] = useState<{ body: string; prices: CartPrices } | null>(null);

  useEffect(() => {
    if (!items.length) return;
    const ac = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch("/api/cart/price", { method: "POST", headers: { "content-type": "application/json" }, body, signal: ac.signal });
        const json = (await res.json()) as { ok: boolean; lines?: ServerQuoteResult[]; subtotal?: number | null };
        setState({ body, prices: json.ok && json.lines ? { status: "ok", lines: json.lines, subtotal: json.subtotal ?? null } : { status: "error" } });
      } catch {
        if (!ac.signal.aborted) setState({ body, prices: { status: "error" } });
      }
    }, 200);
    return () => {
      window.clearTimeout(timer);
      ac.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- body captures items
  }, [body]);

  return state?.body === body ? state.prices : { status: "loading" };
}
