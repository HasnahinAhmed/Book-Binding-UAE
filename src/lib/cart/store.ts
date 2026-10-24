"use client";

import { useSyncExternalStore } from "react";
import { CART_EVENT as EVENT, CART_KEY as KEY } from "./count";
import { cartItemSchema, MAX_CART_ITEMS, type CartItem, type CartItemInput } from "./schema";

const EMPTY: CartItem[] = [];

let cache: { raw: string | null; items: CartItem[] } = { raw: null, items: EMPTY };

function read(): CartItem[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return EMPTY;
  }
  if (raw === cache.raw) return cache.items;
  let items: CartItem[] = EMPTY;
  try {
    const parsed = JSON.parse(raw ?? "[]") as unknown[];
    // drop anything that no longer matches the schema (old versions, tampering)
    items = Array.isArray(parsed)
      ? parsed.flatMap((x) => {
          const r = cartItemSchema.safeParse(x);
          return r.success ? [r.data] : [];
        })
      : EMPTY;
  } catch {
    items = EMPTY;
  }
  cache = { raw, items };
  return items;
}

function write(items: CartItem[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items.slice(0, MAX_CART_ITEMS)));
  } catch {
    /* storage blocked: the cart cannot persist */
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
  const onStorage = (e: StorageEvent) => e.key === KEY && cb();
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useCart(): CartItem[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export const cart = {
  add(item: Omit<CartItemInput, "id" | "addedAt">): boolean {
    const items = read();
    if (items.length >= MAX_CART_ITEMS) return false;
    const parsed = cartItemSchema.safeParse({ ...item, id: crypto.randomUUID(), addedAt: Date.now() });
    if (!parsed.success) return false;
    write([...items, parsed.data]);
    return true;
  },
  remove(id: string) {
    write(read().filter((i) => i.id !== id));
  },
  setQuantity(id: string, quantity: number) {
    write(read().map((i) => (i.id === id ? { ...i, request: { ...i.request, quantity } } : i)));
  },
  clear() {
    write([]);
  },
};
