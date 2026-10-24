import { PRODUCTS, PRODUCT_ORDER, type Product, type ProductId } from "./pricing/catalog";
import { unitPriceFor } from "./pricing/quote";

const SLUGS: Record<ProductId, string> = {
  regular: "regular-hardcover",
  custom: "custom-design",
  leather: "pu-leather",
  "luxury-box": "luxury-box",
};

export const productSlug = (id: ProductId) => SLUGS[id];

export function productFromSlug(slug: string): Product | undefined {
  const id = (Object.keys(SLUGS) as ProductId[]).find((k) => SLUGS[k] === slug);
  return id ? PRODUCTS[id] : undefined;
}

export const allProducts = () => PRODUCT_ORDER.map((id) => PRODUCTS[id]);

/** Lowest unit price at the minimum order quantity (what "From AED …" means). */
export function startingPrice(p: Product) {
  return unitPriceFor(p, p.minQty);
}

/** Lower per-unit price offered at a higher quantity, if any. */
export function quantityTier(p: Product) {
  const start = startingPrice(p);
  return p.tiers.find((t) => t.minQty > p.minQty && t.unitPrice < start);
}
