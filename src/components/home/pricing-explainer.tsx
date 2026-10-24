import { useLocale, useTranslations } from "next-intl";
import { PRINT_RATES } from "@/lib/pricing/catalog";
import { calculateQuote } from "@/lib/pricing/quote";
import { formatAED } from "@/lib/pricing/money";
import { SectionHeading } from "@/components/ui/section-heading";
import { PriceBreakdown } from "@/components/product/price-breakdown";

const EXAMPLE = {
  productId: "regular",
  quantity: 2,
  coverColorId: "navy",
  foilTone: "gold",
  printing: { pages: 120, paper: "80gsm", mode: "bw" },
} as const;

export function PricingExplainer() {
  const t = useTranslations("home");
  const locale = useLocale();
  const example = calculateQuote(EXAMPLE);
  if (!example.ok) throw new Error("pricing example is invalid");

  return (
    <section id="pricing" aria-labelledby="pricing-title" className="scroll-mt-20 bg-canvas py-20 md:py-28">
      <div className="container-page grid gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <SectionHeading id="pricing-title" eyebrow={t("printingEyebrow")} title={t("printingTitle")} lead={t("printingLead")} />
          <div className="mt-10 overflow-hidden rounded-xl bg-white ring-1 ring-line" data-reveal>
            <table className="w-full text-start">
              <caption className="px-5 pt-4 pb-2 text-start text-sm font-semibold text-navy-950">{t("printingTable")}</caption>
              <thead>
                <tr className="border-b border-line text-sm text-ink-subtle">
                  <th scope="col" className="px-5 py-2.5 text-start font-medium">{t("paper")}</th>
                  <th scope="col" className="px-5 py-2.5 text-start font-medium">{t("color")}</th>
                  <th scope="col" className="px-5 py-2.5 text-start font-medium">{t("bw")}</th>
                </tr>
              </thead>
              <tbody>
                {(Object.keys(PRINT_RATES) as (keyof typeof PRINT_RATES)[]).map((paper) => (
                  <tr key={paper} className="border-b border-line last:border-0">
                    <th scope="row" className="px-5 py-3.5 text-start font-medium text-navy-950">
                      <span className="ltr-value">{paper.replace("gsm", " GSM")}</span>
                    </th>
                    <td className="px-5 py-3.5 tabular-nums whitespace-nowrap">{t("perPage", { price: formatAED(PRINT_RATES[paper].color, locale) })}</td>
                    <td className="px-5 py-3.5 tabular-nums whitespace-nowrap">{t("perPage", { price: formatAED(PRINT_RATES[paper].bw, locale) })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="border-t border-line px-5 py-3 text-sm text-ink-muted">{t("bw80Note")}</p>
          </div>
        </div>

        <div className="lg:pt-24" data-reveal>
          <p className="text-sm font-semibold text-navy-950">{t("exampleTitle")}</p>
          <p className="mt-1 text-[0.9375rem] text-ink-muted">{t("exampleLine")}</p>
          <PriceBreakdown quote={example.quote} className="mt-4 shadow-card" />
        </div>
      </div>
    </section>
  );
}
