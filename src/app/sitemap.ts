import type { MetadataRoute } from "next";
import { site } from "@/config/site";
import { allProducts, productSlug } from "@/lib/products";

const PAGES = ["", "/thesis-builder", ...allProducts().map((p) => `/products/${productSlug(p.id)}`)];

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.flatMap((path) =>
    (["en", "ar"] as const).map((locale) => ({
      url: `${site.url}/${locale}${path}`,
      changeFrequency: "monthly" as const,
      priority: path === "" ? 1 : 0.8,
      alternates: { languages: { en: `${site.url}/en${path}`, ar: `${site.url}/ar${path}` } },
    })),
  );
}
