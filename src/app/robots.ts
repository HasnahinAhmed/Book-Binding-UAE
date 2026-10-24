import type { MetadataRoute } from "next";
import { site } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  const privatePaths = ["/api/", "/en/account", "/ar/account", "/en/admin", "/ar/admin", "/en/cart", "/ar/cart", "/en/checkout", "/ar/checkout"];
  return { rules: [{ userAgent: "*", allow: "/", disallow: privatePaths }], sitemap: `${site.url}/sitemap.xml` };
}
