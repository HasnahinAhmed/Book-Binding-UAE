import { useTranslations } from "next-intl";
import type { Design } from "@/lib/cart/schema";
import type { QuoteRequest } from "@/lib/quote/server-quote";

/** Readable list of an item's choices. Works in server and client components. */
export function ItemSummary({
  request,
  design,
  file,
}: {
  request: QuoteRequest;
  design: Partial<Design> | null;
  file?: { name: string; pages: number } | null;
}) {
  const t = useTranslations();
  const parts: string[] = [t(`colors.${request.coverColorId}`)];
  if (request.boxColorId) parts.push(`${t("order.boxColor")}: ${t(`colors.${request.boxColorId}`)}`);
  if (request.foilTone) parts.push(`${t("order.foil")}: ${t(`colors.${request.foilTone}`)}`);
  if (request.spinePrinting) parts.push(t("quote.spine"));
  if (request.corners && request.corners !== "none") parts.push(`${t("quote.corners")}: ${t(`colors.${request.corners}`)}`);
  const p = request.printing;
  const title = design?.text?.title || design?.text?.titleAr;
  return (
    <ul className="space-y-0.5 text-sm text-ink-muted">
      <li>{parts.join(" · ")}</li>
      <li>
        {p
          ? t("cart.printing", { pages: p.pages, paper: t(`quote.paper.${p.paper}`), mode: t(`quote.mode.${p.mode}`) })
          : t("cart.noPrinting")}
      </li>
      {file && <li dir="auto">{t("cart.pdf", { name: file.name, pages: file.pages })}</li>}
      {title && (
        <li>
          {t("cart.coverTitle")}: <span dir="auto">{title}</span>
        </li>
      )}
      {design?.hasLogo && <li className="text-warning">{t("cart.logoNote")}</li>}
    </ul>
  );
}
