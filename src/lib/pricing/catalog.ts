/**
 * Product + price catalogue. Single source of truth for pricing until the
 * admin-managed database takes over (Milestone 9).
 *
 * Every price carries a status and source. See docs/PRICING_RULES.md.
 *  - "confirmed":   appears in Book Binding UAE Catalog.pdf
 *  - "unconfirmed": only in Demo 2 data; shown as an estimate, never charged online
 */
import { aed, type Fils } from "./money";

export type PriceStatus = "confirmed" | "unconfirmed";

export type ProductId = "regular" | "custom" | "leather" | "luxury-box";
export type FoilTone = "gold" | "silver";
export type PaperId = "80gsm" | "120gsm";
export type PrintMode = "color" | "bw";
export type CornerOption = "none" | "gold" | "silver";

export interface ColorOption {
  id: string;
  hex: string;
  /** Material texture hint for the 3D preview. */
  texture: "cloth" | "leather" | "croc";
}

export interface PriceTier {
  /** applies when quantity >= minQty */
  minQty: number;
  unitPrice: Fils;
}

export interface Product {
  id: ProductId;
  /** what one unit is: a single book, or a book + matching box */
  unit: "book" | "bundle";
  minQty: number;
  tiers: PriceTier[];
  priceStatus: PriceStatus;
  priceSource: string;
  coverColors: ColorOption[];
  /** extra colours available on request (catalogue shows "+ More") */
  moreColorsOnRequest: boolean;
  boxColors?: ColorOption[];
  /** cover lettering method */
  finish: "screen" | "digital-or-screen" | "foil";
  foilTones: FoilTone[];
  images: { card: string; gallery: string[] };
}

const BLACK: ColorOption = { id: "black", hex: "#16181D", texture: "cloth" };
const MAROON: ColorOption = { id: "maroon", hex: "#6E1A2C", texture: "cloth" };
const NAVY: ColorOption = { id: "navy", hex: "#1C2F5E", texture: "cloth" };
const ACERO: ColorOption = { id: "acero", hex: "#23262B", texture: "leather" };
const MADERA: ColorOption = { id: "madera", hex: "#7A3B24", texture: "leather" };
const TEJUS: ColorOption = { id: "tejus", hex: "#C4953A", texture: "croc" };

const CATALOGUE_PDF = "Book Binding UAE Catalog.pdf (PU Luxury Cover & Luxury Box)";
const DEMO2 = "Demo 2 product data — awaiting owner confirmation";

export const PRODUCTS: Record<ProductId, Product> = {
  regular: {
    id: "regular",
    unit: "book",
    minQty: 1,
    tiers: [
      { minQty: 1, unitPrice: aed(120) },
      { minQty: 2, unitPrice: aed(100) },
    ],
    priceStatus: "unconfirmed",
    priceSource: DEMO2,
    coverColors: [BLACK, MAROON, NAVY],
    moreColorsOnRequest: false,
    finish: "screen",
    foilTones: ["gold", "silver"],
    images: {
      card: "regular-navy",
      gallery: ["regular-navy", "regular-maroon", "regular-black-1", "regular-black-arabic-3", "regular-black-arabic-2"],
    },
  },
  custom: {
    id: "custom",
    unit: "book",
    minQty: 1,
    tiers: [
      { minQty: 1, unitPrice: aed(120) },
      { minQty: 2, unitPrice: aed(100) },
    ],
    priceStatus: "unconfirmed",
    priceSource: DEMO2,
    coverColors: [BLACK, MAROON, NAVY],
    moreColorsOnRequest: true,
    finish: "digital-or-screen",
    foilTones: [],
    images: { card: "custom-orange", gallery: ["custom-orange", "custom-navy-1", "custom-navy-2"] },
  },
  leather: {
    id: "leather",
    unit: "book",
    minQty: 3,
    tiers: [{ minQty: 3, unitPrice: aed(300) }],
    priceStatus: "unconfirmed",
    priceSource: DEMO2,
    coverColors: [ACERO, MADERA, TEJUS],
    moreColorsOnRequest: true,
    finish: "foil",
    foilTones: ["gold", "silver"],
    images: { card: "leather-madera", gallery: ["leather-madera", "leather-black", "leather-cream"] },
  },
  "luxury-box": {
    id: "luxury-box",
    unit: "bundle",
    // Catalogue: "Minimum Order Quantity: 2 Bundel" (open question P6).
    minQty: 2,
    tiers: [{ minQty: 1, unitPrice: aed(1000) }],
    priceStatus: "confirmed",
    priceSource: CATALOGUE_PDF,
    coverColors: [ACERO, MADERA, TEJUS],
    moreColorsOnRequest: true,
    boxColors: [ACERO, MADERA, TEJUS],
    finish: "foil",
    foilTones: ["gold", "silver"],
    images: { card: "box-workshop", gallery: ["box-workshop", "leather-madera", "leather-swatches"] },
  },
};

export const PRODUCT_ORDER: ProductId[] = ["regular", "custom", "leather", "luxury-box"];

/** Per-book add-ons. Source: catalogue "Additional items & items Price". */
export const ADDONS = {
  spinePrinting: { price: aed(20), status: "confirmed" as PriceStatus },
  metalCorners: { price: aed(5), status: "confirmed" as PriceStatus },
} as const;

/**
 * Interior page printing, per page, per copy. Source: catalogue
 * "Page Printing Price". 80 GSM B&W is "1 AED for 5 pages" = 0.20/page
 * (rounding for non-multiples of 5 is open question P1).
 */
export const PRINT_RATES: Record<PaperId, Record<PrintMode, Fils>> = {
  "80gsm": { color: aed(0.5), bw: aed(0.2) },
  "120gsm": { color: aed(1), bw: aed(0.5) },
};

/** Sanity limits for input validation (not business rules). */
export const LIMITS = {
  maxQuantity: 500,
  maxPages: 2000,
  maxTextLength: 200,
} as const;

/** Spine thickness for the preview, from Demo 2: 0.5 cm boards + 1 cm per 60 pages. */
export function spineThicknessMm(pages: number): number {
  return 5 + (pages / 60) * 10;
}
