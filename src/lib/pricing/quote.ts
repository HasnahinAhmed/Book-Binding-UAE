/**
 * Pure quote calculation. Runs in the browser for the live estimate and on
 * the server as the authoritative price. Never trust a client-sent total.
 */
import { z } from "zod";
import {
  ADDONS,
  LIMITS,
  PRINT_RATES,
  PRODUCTS,
  type PaperId,
  type PrintMode,
  type Product,
  type ProductId,
} from "./catalog";
import type { Fils } from "./money";

export const quoteInputSchema = z.object({
  productId: z.enum(["regular", "custom", "leather", "luxury-box"]),
  quantity: z.number().int().min(1).max(LIMITS.maxQuantity),
  coverColorId: z.string().min(1).max(40),
  boxColorId: z.string().min(1).max(40).optional(),
  foilTone: z.enum(["gold", "silver"]).optional(),
  spinePrinting: z.boolean().default(false),
  corners: z.enum(["none", "gold", "silver"]).default("none"),
  printing: z
    .object({
      pages: z.number().int().min(1).max(LIMITS.maxPages),
      paper: z.enum(["80gsm", "120gsm"]),
      mode: z.enum(["color", "bw"]),
      /** "pdf" only when the server counted the pages of an uploaded file */
      pageCountSource: z.enum(["estimate", "pdf"]).default("estimate"),
    })
    .nullable()
    .default(null),
});

export type QuoteInput = z.input<typeof quoteInputSchema>;
export type ParsedQuoteInput = z.output<typeof quoteInputSchema>;

export type QuoteLineKind = "cover" | "printing" | "spine" | "corners";

export interface QuoteLine {
  kind: QuoteLineKind;
  unitPrice: Fils;
  quantity: number;
  /** for printing: pages per copy and rate per page */
  pages?: number;
  ratePerPage?: Fils;
  paper?: PaperId;
  mode?: PrintMode;
  total: Fils;
  status: "confirmed" | "unconfirmed";
}

export interface Quote {
  productId: ProductId;
  quantity: number;
  lines: QuoteLine[];
  coverSubtotal: Fils;
  printingSubtotal: Fils;
  addonsSubtotal: Fils;
  /** goods total; delivery is added at checkout once fees are confirmed */
  subtotal: Fils;
  /** true when any line uses an unconfirmed price → not payable online */
  hasUnconfirmedPrices: boolean;
  pageCountIsEstimate: boolean;
}

export type QuoteError =
  | { code: "invalid_input"; issues: string[] }
  | { code: "below_minimum"; minQty: number }
  | { code: "invalid_color" }
  | { code: "invalid_box_color" }
  | { code: "invalid_foil" };

export type QuoteResult = { ok: true; quote: Quote } | { ok: false; error: QuoteError };

export function unitPriceFor(product: Product, quantity: number): Fils {
  let price = product.tiers[0]!.unitPrice;
  for (const tier of product.tiers) if (quantity >= tier.minQty) price = tier.unitPrice;
  return price;
}

export function calculateQuote(raw: unknown): QuoteResult {
  const parsed = quoteInputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: { code: "invalid_input", issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) },
    };
  }
  const input = parsed.data;
  const product = PRODUCTS[input.productId];

  if (input.quantity < product.minQty) return { ok: false, error: { code: "below_minimum", minQty: product.minQty } };
  if (!product.coverColors.some((c) => c.id === input.coverColorId)) return { ok: false, error: { code: "invalid_color" } };
  if (product.boxColors) {
    if (!input.boxColorId || !product.boxColors.some((c) => c.id === input.boxColorId))
      return { ok: false, error: { code: "invalid_box_color" } };
  }
  if (product.foilTones.length > 0) {
    if (!input.foilTone || !product.foilTones.includes(input.foilTone)) return { ok: false, error: { code: "invalid_foil" } };
  } else if (input.foilTone) {
    return { ok: false, error: { code: "invalid_foil" } };
  }

  const q = input.quantity;
  const lines: QuoteLine[] = [];
  const unit = unitPriceFor(product, q);
  lines.push({ kind: "cover", unitPrice: unit, quantity: q, total: unit * q, status: product.priceStatus });

  if (input.printing) {
    const { pages, paper, mode } = input.printing;
    const rate = PRINT_RATES[paper][mode];
    const perCopy = pages * rate;
    lines.push({
      kind: "printing",
      unitPrice: perCopy,
      quantity: q,
      pages,
      ratePerPage: rate,
      paper,
      mode,
      total: perCopy * q,
      status: "confirmed",
    });
  }
  if (input.spinePrinting) {
    const p = ADDONS.spinePrinting.price;
    lines.push({ kind: "spine", unitPrice: p, quantity: q, total: p * q, status: ADDONS.spinePrinting.status });
  }
  if (input.corners !== "none") {
    const p = ADDONS.metalCorners.price;
    lines.push({ kind: "corners", unitPrice: p, quantity: q, total: p * q, status: ADDONS.metalCorners.status });
  }

  const sum = (kinds: QuoteLineKind[]) => lines.filter((l) => kinds.includes(l.kind)).reduce((s, l) => s + l.total, 0);
  const coverSubtotal = sum(["cover"]);
  const printingSubtotal = sum(["printing"]);
  const addonsSubtotal = sum(["spine", "corners"]);

  return {
    ok: true,
    quote: {
      productId: product.id,
      quantity: q,
      lines,
      coverSubtotal,
      printingSubtotal,
      addonsSubtotal,
      subtotal: coverSubtotal + printingSubtotal + addonsSubtotal,
      hasUnconfirmedPrices: lines.some((l) => l.status === "unconfirmed"),
      pageCountIsEstimate: input.printing ? input.printing.pageCountSource !== "pdf" : false,
    },
  };
}
