"use client";

import { useSyncExternalStore } from "react";

// Lightweight cart badge for the header: counts items without loading the
// validation code. The cart page validates every item properly.
export const CART_KEY = "bbu-cart-v1";
export const CART_EVENT = "bbu-cart-change";

function read(): number {
  try {
    const v = JSON.parse(window.localStorage.getItem(CART_KEY) ?? "[]") as unknown;
    return Array.isArray(v) ? Math.min(v.length, 99) : 0;
  } catch {
    return 0;
  }
}

function subscribe(cb: () => void) {
  const onStorage = (e: StorageEvent) => e.key === CART_KEY && cb();
  window.addEventListener(CART_EVENT, cb);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CART_EVENT, cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useCartCount(): number {
  return useSyncExternalStore(subscribe, read, () => 0);
}
