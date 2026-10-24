"use client";

import { useSearchParams } from "next/navigation";
import { productFromSlug } from "@/lib/products";
import { Configurator } from "./configurator";

/** Reads ?product=<slug> so a product page can open the builder preselected. */
export function ConfiguratorEntry() {
  const params = useSearchParams();
  const fromUrl = productFromSlug(params.get("product") ?? "");
  return <Configurator key={fromUrl?.id ?? "default"} initialProduct={fromUrl?.id ?? "regular"} productFromUrl={!!fromUrl} />;
}
