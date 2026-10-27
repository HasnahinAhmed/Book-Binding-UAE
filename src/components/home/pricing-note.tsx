import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { SectionHeading } from "@/components/ui/section-heading";
import { ORDER_HREF } from "@/components/layout/nav-items";

/**
 * Explains how a price is made up, without a price table: detailed prices
 * live in the builder and on product pages, not on the homepage.
 */
export function PricingNote() {
  const t = useTranslations("home");
  const parts = [
    { n: 1, title: t("pricePart1"), desc: t("pricePart1Desc") },
    { n: 2, title: t("pricePart2"), desc: t("pricePart2Desc") },
    { n: 3, title: t("pricePart3"), desc: t("pricePart3Desc") },
  ];
  return (
    <section id="pricing" aria-labelledby="pricing-title" className="scroll-mt-24 border-y border-line bg-canvas py-20 md:py-24">
      <div className="container-page grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
        <div>
          <SectionHeading id="pricing-title" eyebrow={t("printingEyebrow")} title={t("printingTitle")} lead={t("printingLead")} />
          <Link
            href={ORDER_HREF}
            className="mt-6 inline-flex items-center gap-1.5 font-semibold text-brand-700 hover:underline"
            data-reveal
          >
            {t("pricingLink")}
            <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
          </Link>
        </div>
        <ol className="divide-y divide-line self-center" data-reveal-group>
          {parts.map((p) => (
            <li key={p.n} className="flex gap-5 py-5 first:pt-0 last:pb-0">
              <span className="w-5 shrink-0 text-2xl leading-6 font-semibold text-brand-600" aria-hidden="true">
                {p.n === 1 ? "" : "+"}
              </span>
              <div>
                <h3 className="font-semibold text-ink">{p.title}</h3>
                <p className="mt-1 text-ink-muted">{p.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
