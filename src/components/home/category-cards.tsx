import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight, Info } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { imageInfo } from "@/lib/images";
import { allProducts, productSlug, quantityTier, startingPrice } from "@/lib/products";
import { formatAED } from "@/lib/pricing/money";
import { Badge } from "@/components/ui/badge";
import { SectionHeading } from "@/components/ui/section-heading";

export async function CategoryCards() {
  const t = await getTranslations();
  const locale = await getLocale();

  return (
    <section id="products" aria-labelledby="products-title" className="container-page scroll-mt-20 py-20 md:py-28">
      <SectionHeading
        id="products-title"
        eyebrow={t("home.productsEyebrow")}
        title={t("home.productsTitle")}
        lead={t("home.productsLead")}
      />
      <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4" data-reveal-group>
        {allProducts().map((p) => {
          const img = imageInfo(p.images.card);
          const tier = quantityTier(p);
          const isBox = p.unit === "bundle";
          return (
            <li key={p.id}>
              <Link
                href={`/products/${productSlug(p.id)}`}
                className="group flex h-full flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-line transition-[box-shadow,transform] duration-300 ease-[var(--ease-out-soft)] hover:-translate-y-1 hover:shadow-lift hover:ring-brand-200"
              >
                <div className="relative flex aspect-[4/3] items-center sm:aspect-[4/5] justify-center overflow-hidden bg-canvas">
                  <Image
                    src={img.src}
                    alt={t("home.sampleAlt", { desc: t(`samples.${p.images.card}`) })}
                    width={img.width}
                    height={img.height}
                    sizes="(min-width: 1024px) 300px, (min-width: 640px) 45vw, 90vw"
                    className={
                      isBox
                        ? "h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        : "h-[86%] w-auto object-contain drop-shadow-[0_18px_24px_rgba(11,28,54,0.22)] transition-transform duration-500 ease-[var(--ease-out-soft)] group-hover:scale-[1.04]"
                    }
                  />
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="text-lg font-semibold text-ink">{t(`products.${p.id}.name`)}</h3>
                  <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-muted">{t(`products.${p.id}.short`)}</p>
                  <div className="mt-auto pt-5">
                    <p className="text-sm text-ink-subtle">{t("home.from")}</p>
                    <p className="flex flex-wrap items-baseline gap-x-1.5">
                      <span className="ltr-value text-xl font-semibold text-ink">{formatAED(startingPrice(p), locale)}</span>
                      <span className="text-sm text-ink-subtle">{t(`home.perUnit.${p.unit}`)}</span>
                    </p>
                    <ul className="mt-2 space-y-1 text-sm text-ink-muted">
                      {p.minQty > 1 && (
                        <li>{isBox ? t("home.minBundles", { count: p.minQty }) : t("home.minQty", { count: p.minQty })}</li>
                      )}
                      {tier && <li>{t("home.tierNote", { price: formatAED(tier.unitPrice, locale), qty: tier.minQty })}</li>}
                    </ul>
                    {p.priceStatus === "unconfirmed" && (
                      <Badge tone="warning" className="mt-3" title={t("home.estimateHelp")}>
                        <Info className="size-3" aria-hidden="true" />
                        {t("home.estimate")}
                      </Badge>
                    )}
                    <span className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-brand-700">
                      {t("home.viewProduct")}
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" aria-hidden="true" />
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
