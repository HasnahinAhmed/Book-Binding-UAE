/** Header/footer navigation. Kept short on purpose; only routes that exist are listed. */
export const NAV_ITEMS = [
  { key: "products", href: "/#products" },
  { key: "builder", href: "/thesis-builder" },
  { key: "howItWorks", href: "/#how-it-works" },
  { key: "contact", href: "/#contact" },
] as const;

/** Where every "Order Online" button goes. */
export const ORDER_HREF = "/thesis-builder";

export type NavKey = (typeof NAV_ITEMS)[number]["key"];
