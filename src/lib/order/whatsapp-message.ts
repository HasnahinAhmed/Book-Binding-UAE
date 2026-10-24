import type { Product } from "@/lib/pricing/catalog";
import type { ParsedQuoteInput, Quote } from "@/lib/pricing/quote";
import { formatAED } from "@/lib/pricing/money";

type T = (key: string, values?: Record<string, string | number>) => string;

/** Plain-text order summary for a WhatsApp hand-off. No personal data is added here. */
export function buildWhatsappOrderText(opts: {
  t: T;
  locale: string;
  product: Product;
  productName: string;
  input: ParsedQuoteInput;
  quote: Quote;
  pageUrl?: string;
}): string {
  const { t, locale, input, quote, productName } = opts;
  const color = (id: string) => t(`colors.${id}`);
  const lines = [
    t("order.wa.intro"),
    "",
    `${t("order.wa.product")}: ${productName}`,
    `${t("order.wa.qty")}: ${input.quantity}`,
    `${t("order.wa.cover")}: ${color(input.coverColorId)}`,
  ];
  if (input.boxColorId) lines.push(`${t("order.wa.box")}: ${color(input.boxColorId)}`);
  if (input.foilTone) lines.push(`${t("order.wa.foil")}: ${color(input.foilTone)}`);
  if (input.spinePrinting) lines.push(t("order.wa.spine"));
  if (input.corners !== "none") lines.push(`${t("order.wa.corners")}: ${color(input.corners)}`);
  if (input.printing) {
    const p = input.printing;
    lines.push(
      `${t("order.wa.printing")}: ${p.pages} × ${t(`quote.paper.${p.paper}`)} · ${t(`quote.mode.${p.mode}`)}`,
    );
  } else {
    lines.push(t("order.wa.noPrinting"));
  }
  lines.push(
    "",
    `${t("order.wa.subtotal")}: ${formatAED(quote.subtotal, locale)}${quote.hasUnconfirmedPrices || quote.pageCountIsEstimate ? ` ${t("order.wa.estimate")}` : ""}`,
  );
  if (opts.pageUrl) lines.push(`${t("order.wa.page")}: ${opts.pageUrl}`);
  return lines.join("\n");
}
