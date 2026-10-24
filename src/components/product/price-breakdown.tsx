import { useLocale, useTranslations } from "next-intl";
import { Info } from "lucide-react";
import type { Quote, QuoteLine } from "@/lib/pricing/quote";
import { formatAED } from "@/lib/pricing/money";
import { cn } from "@/lib/cn";

/** Transparent price breakdown. Cover/binding and printing are always separate lines. */
export function PriceBreakdown({ quote, className, showNotes = true }: { quote: Quote; className?: string; showNotes?: boolean }) {
  const t = useTranslations("quote");
  const locale = useLocale();
  const money = (f: number) => formatAED(f, locale);

  const detail = (l: QuoteLine) => {
    if (l.kind === "printing")
      return `${t(`paper.${l.paper!}`)} · ${t(`mode.${l.mode!}`)} — ${t("printingDetail", { pages: l.pages!, rate: money(l.ratePerPage!), qty: l.quantity })}`;
    return t(l.kind === "cover" ? "coverDetail" : "addonDetail", { qty: l.quantity, price: money(l.unitPrice) });
  };

  return (
    <div className={cn("rounded-xl bg-white ring-1 ring-line", className)}>
      <dl className="divide-y divide-line">
        {quote.lines.map((l) => (
          <div key={l.kind} className="flex items-start justify-between gap-4 px-5 py-3.5">
            <dt className="min-w-0">
              <span className="flex items-center gap-1.5 font-medium text-navy-950">
                {t(l.kind)}
                {l.status === "unconfirmed" && <span className="text-warning" aria-label={t("unconfirmed")}>*</span>}
              </span>
              <span className="mt-0.5 block text-sm text-ink-subtle">{detail(l)}</span>
            </dt>
            <dd className="ltr-value shrink-0 font-medium tabular-nums text-navy-950">{money(l.total)}</dd>
          </div>
        ))}
        <div className="flex items-center justify-between gap-4 rounded-b-xl bg-navy-50/60 px-5 py-4">
          <dt className="font-semibold text-navy-950">{t("subtotal")}</dt>
          <dd className="ltr-value text-xl font-semibold tabular-nums text-navy-950">{money(quote.subtotal)}</dd>
        </div>
      </dl>
      {showNotes && (
        <ul className="space-y-1.5 border-t border-line px-5 py-3.5 text-sm text-ink-muted">
          {quote.hasUnconfirmedPrices && (
            <li className="flex gap-2 text-warning">
              <span aria-hidden="true">*</span>
              {t("unconfirmed")}
            </li>
          )}
          {quote.pageCountIsEstimate && (
            <li className="flex gap-2">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {t("estimatedPages")}
            </li>
          )}
          <li className="flex gap-2">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {t("delivery")}
          </li>
        </ul>
      )}
    </div>
  );
}
