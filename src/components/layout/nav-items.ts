/** Header/footer navigation. Only routes that exist are listed. */
export const NAV_ITEMS = [
  { key: "products", href: "/#products" },
  { key: "contact", href: "/#contact" },
] as const;

export type NavKey = (typeof NAV_ITEMS)[number]["key"];
