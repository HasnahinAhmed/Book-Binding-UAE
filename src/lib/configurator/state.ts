/**
 * Configurator state → (a) 3D preview config and (b) pricing input.
 * The preview is an approximation of the finished book; pricing comes only
 * from the catalogue via calculateQuote.
 */
import { z } from "zod";
import { DEFAULT_CONFIG, FOIL_COLORS, type BookConfig } from "@/lib/book/config";
import {
  LIMITS,
  PRODUCTS,
  spineThicknessMm,
  type CornerOption,
  type FoilTone,
  type PaperId,
  type PrintMode,
  type ProductId,
} from "@/lib/pricing/catalog";
import type { QuoteInput } from "@/lib/pricing/quote";
import type { QuoteRequest } from "@/lib/quote/server-quote";

export type CoverLanguage = "en" | "ar" | "both";
export type BindingDirection = "auto" | "ltr" | "rtl";

const text = (max = 160) => z.string().max(max).default("");

export const coverTextSchema = z.object({
  university: text(),
  universityAr: text(),
  college: text(),
  title: text(300),
  titleAr: text(300),
  author: text(),
  authorAr: text(),
  supervisor: text(),
  year: text(40),
});
export type CoverText = z.output<typeof coverTextSchema>;

export interface ConfiguratorState {
  productId: ProductId;
  coverColorId: string;
  boxColorId?: string;
  foilTone?: FoilTone;
  corners: CornerOption;
  spinePrinting: boolean;
  quantity: number;
  printing: { enabled: boolean; pages: number; paper: PaperId; mode: PrintMode; upload: UploadedPdf | null };
  language: CoverLanguage;
  direction: BindingDirection;
  text: CoverText;
  /** client-only data URL of an uploaded logo (never sent to the server) */
  logoDataUrl: string;
}

/** A PDF stored privately on the server; `pages` was counted by the server. */
export interface UploadedPdf {
  id: string;
  name: string;
  pages: number;
  sizeBytes: number;
}

export const EMPTY_TEXT: CoverText = coverTextSchema.parse({});

export function initialState(productId: ProductId = "regular"): ConfiguratorState {
  const p = PRODUCTS[productId];
  return {
    productId,
    coverColorId: p.coverColors[0]!.id,
    boxColorId: p.boxColors?.[0]?.id,
    foilTone: p.foilTones[0],
    corners: "none",
    spinePrinting: false,
    quantity: p.minQty,
    printing: { enabled: true, pages: 120, paper: "80gsm", mode: "bw", upload: null },
    language: "en",
    direction: "auto",
    text: EMPTY_TEXT,
    logoDataUrl: "",
  };
}

/** Switching product keeps text + printing but resets options the new product may not offer. */
export function switchProduct(s: ConfiguratorState, productId: ProductId): ConfiguratorState {
  const fresh = initialState(productId);
  const p = PRODUCTS[productId];
  return {
    ...s,
    productId,
    coverColorId: p.coverColors.some((c) => c.id === s.coverColorId) ? s.coverColorId : fresh.coverColorId,
    boxColorId: fresh.boxColorId,
    foilTone: s.foilTone && p.foilTones.includes(s.foilTone) ? s.foilTone : fresh.foilTone,
    quantity: Math.max(s.quantity, p.minQty),
  };
}

export function isRtl(s: ConfiguratorState): boolean {
  if (s.direction !== "auto") return s.direction === "rtl";
  return s.language === "ar";
}

export function toQuoteInput(s: ConfiguratorState): QuoteInput {
  return {
    productId: s.productId,
    quantity: s.quantity,
    coverColorId: s.coverColorId,
    boxColorId: s.boxColorId,
    foilTone: s.foilTone,
    spinePrinting: s.spinePrinting,
    corners: s.corners,
    printing: s.printing.enabled
      ? {
          pages: s.printing.upload?.pages ?? s.printing.pages,
          paper: s.printing.paper,
          mode: s.printing.mode,
          pageCountSource: s.printing.upload ? "pdf" : "estimate",
        }
      : null,
  };
}

/** What the browser sends to /api/quote: choices and an upload id, never prices or page-count claims. */
export function toQuoteRequest(s: ConfiguratorState): QuoteRequest {
  const { printing: _p, ...rest } = toQuoteInput(s);
  void _p;
  return {
    ...rest,
    printing: s.printing.enabled
      ? {
          pages: s.printing.upload?.pages ?? s.printing.pages,
          paper: s.printing.paper,
          mode: s.printing.mode,
          ...(s.printing.upload ? { uploadId: s.printing.upload.id } : {}),
        }
      : null,
  };
}

/** Sample text shown until the customer types their own, so the cover is never blank. */
export const SAMPLE_TEXT: Record<"en" | "ar", Partial<CoverText>> = {
  en: { university: "University Name", title: "Your Thesis Title", author: "Your Name", year: String(new Date().getFullYear()) },
  ar: { universityAr: "اسم الجامعة", titleAr: "عنوان الرسالة", authorAr: "اسم الطالب", year: String(new Date().getFullYear()) },
};

export function toBookConfig(s: ConfiguratorState, opts: { mobile: boolean }): BookConfig {
  const p = PRODUCTS[s.productId];
  const color = p.coverColors.find((c) => c.id === s.coverColorId) ?? p.coverColors[0]!;
  const showEn = s.language !== "ar";
  const showAr = s.language !== "en";
  const pick = (key: keyof CoverText, lang: "en" | "ar") => {
    const v = s.text[key].trim();
    return v || (SAMPLE_TEXT[lang][key] ?? "");
  };
  const textHex = FOIL_COLORS[s.foilTone ?? "gold"].hex;
  const pages = s.printing.enabled ? (s.printing.upload?.pages ?? s.printing.pages) : 120;

  return {
    ...DEFAULT_CONFIG,
    university: showEn ? pick("university", "en") : "",
    universityArabic: showAr ? pick("universityAr", "ar") : "",
    college: s.text.college.trim(),
    department: "",
    title: showEn ? pick("title", "en") : "",
    titleArabic: showAr ? pick("titleAr", "ar") : "",
    subtitle: "",
    company: "",
    author: showEn ? pick("author", "en") : "",
    authorArabic: showAr ? pick("authorAr", "ar") : "",
    authorId: "",
    supervisor: s.text.supervisor.trim(),
    year: s.text.year.trim() || String(new Date().getFullYear()),
    logoDataUrl: s.logoDataUrl,
    logoPosition: "top",
    rtl: isRtl(s),
    labelLang: s.language,
    spineText: s.spinePrinting,
    coverColor: color.hex,
    material: color.texture === "cloth" ? "cloth" : "leather",
    foil: s.foilTone ?? "gold",
    textColor: textHex,
    format: "a4",
    spineStyle: "rounded",
    thickness: Math.round(Math.min(60, Math.max(12, spineThicknessMm(Math.min(pages, LIMITS.maxPages))))),
    headband: "#E5DFCE",
    showFoil: true,
    cornerGuards: s.corners !== "none",
    stitching: color.texture !== "cloth",
    goldBorder: false,
    background: "transparent",
    autoRotate: false,
    float: false,
    zoom: opts.mobile ? 1.3 : 1.28,
    scrollZoom: !opts.mobile,
    touchScroll: opts.mobile,
  };
}
