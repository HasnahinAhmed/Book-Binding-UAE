import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Configurator } from "@/components/configurator/configurator";
import { productFromSlug } from "@/lib/products";

type Params = { params: Promise<{ locale: string }> };
type PageProps = Params & { searchParams: Promise<{ product?: string; design?: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "builder" });
  return {
    title: t("metaTitle"),
    description: t("metaDesc"),
    alternates: { canonical: `/${locale}/thesis-builder`, languages: { en: "/en/thesis-builder", ar: "/ar/thesis-builder" } },
  };
}

export default async function ThesisBuilderPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("builder");
  // ?product=<slug> preselects a product; ?design=<id> opens a saved design
  const sp = await searchParams;
  const fromUrl = productFromSlug(typeof sp.product === "string" ? sp.product : "");
  const designId = typeof sp.design === "string" && /^[0-9a-f-]{36}$/i.test(sp.design) ? sp.design : undefined;
  return (
    <div className="container-page pt-6 pb-10 lg:pt-10">
      <header className="mb-5 max-w-2xl lg:mb-8">
        <h1 className="text-h1 font-semibold text-navy-950 text-balance">{t("title")}</h1>
        <p className="mt-2 text-ink-muted max-lg:hidden">{t("lead")}</p>
      </header>
      <Configurator
        key={`${fromUrl?.id ?? "default"}-${designId ?? ""}`}
        initialProduct={fromUrl?.id ?? "regular"}
        productFromUrl={!!fromUrl}
        designId={designId}
      />
    </div>
  );
}
