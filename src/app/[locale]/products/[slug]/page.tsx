import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, Info } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { imageInfo } from "@/lib/images";
import { allProducts, productFromSlug, productSlug } from "@/lib/products";
import { Badge } from "@/components/ui/badge";
import { Gallery } from "@/components/product/gallery";
import { QuickOrder } from "@/components/product/quick-order";

type Params = { params: Promise<{ locale: string; slug: string }> };

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => allProducts().map((p) => ({ locale, slug: productSlug(p.id) })));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, slug } = await params;
  const product = productFromSlug(slug);
  if (!product) return {};
  const t = await getTranslations({ locale });
  const img = imageInfo(product.images.card);
  return {
    title: t(`products.${product.id}.name`),
    description: t(`products.${product.id}.desc`),
    alternates: {
      canonical: `/${locale}/products/${slug}`,
      languages: { en: `/en/products/${slug}`, ar: `/ar/products/${slug}` },
    },
    openGraph: { images: [{ url: img.src }] },
  };
}

export default async function ProductPage({ params }: Params) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const product = productFromSlug(slug);
  if (!product) notFound();
  const t = await getTranslations();

  const images = product.images.gallery.map((name) => ({
    ...imageInfo(name),
    name,
    alt: t("home.sampleAlt", { desc: t(`samples.${name}`) }),
  }));

  return (
    <div className="container-page pt-6 pb-16 md:pt-10">
      <Link href="/#products" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-navy-900">
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
        {t("productPage.back")}
      </Link>
      <div className="mt-6 grid gap-10 lg:grid-cols-2 lg:gap-14">
        <div className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <Gallery images={images} />
        </div>
        <div className="min-w-0">
          <h1 className="text-h1 font-semibold text-navy-950 text-balance">{t(`products.${product.id}.name`)}</h1>
          <p className="mt-3 text-lg leading-relaxed text-ink-muted">{t(`products.${product.id}.desc`)}</p>
          <dl className="mt-5 flex flex-wrap gap-2">
            <dt className="sr-only">{t("order.finish")}</dt>
            <dd>
              <Badge tone="brand">{t(`products.${product.id}.finish`)}</Badge>
            </dd>
            {product.priceStatus === "unconfirmed" && (
              <dd>
                <Badge tone="warning" title={t("home.estimateHelp")}>
                  <Info className="size-3" aria-hidden="true" />
                  {t("home.estimate")}
                </Badge>
              </dd>
            )}
          </dl>
          <p className="mt-4 text-sm text-ink-subtle">{t("productPage.printingNote")}</p>
          <hr className="my-8 border-line" />
          <h2 className="sr-only">{t("order.title")}</h2>
          <QuickOrder product={product} />
        </div>
      </div>
    </div>
  );
}
