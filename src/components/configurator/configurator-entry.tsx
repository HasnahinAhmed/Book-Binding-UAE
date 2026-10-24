"use client";

import { useSearchParams } from "next/navigation";
import { productFromSlug } from "@/lib/products";
import { Configurator } from "./configurator";

/** Reads ?product=<slug> (preselect a product) and ?design=<id> (open a saved design). */
export function ConfiguratorEntry() {
  const params = useSearchParams();
  const fromUrl = productFromSlug(params.get("product") ?? "");
  const design = params.get("design");
  const designId = design && /^[0-9a-f-]{36}$/i.test(design) ? design : undefined;
  return (
    <Configurator
      key={`${fromUrl?.id ?? "default"}-${designId ?? ""}`}
      initialProduct={fromUrl?.id ?? "regular"}
      productFromUrl={!!fromUrl}
      designId={designId}
    />
  );
}
