"use client";

import { useSearchParams } from "next/navigation";
import { Configurator } from "@/components/configurator/configurator";
import { productFromSlug } from "@/lib/products";

/** Static preview: reads ?product= in the browser instead of on the server. */
export function DemoBuilder() {
  const sp = useSearchParams();
  const fromUrl = productFromSlug(sp.get("product") ?? "");
  return <Configurator key={fromUrl?.id ?? "default"} initialProduct={fromUrl?.id ?? "regular"} productFromUrl={!!fromUrl} />;
}
