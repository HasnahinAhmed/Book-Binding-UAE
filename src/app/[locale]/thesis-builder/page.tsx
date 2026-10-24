import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ConfiguratorEntry } from "@/components/configurator/configurator-entry";

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "builder" });
  return {
    title: t("metaTitle"),
    description: t("metaDesc"),
    alternates: { canonical: `/${locale}/thesis-builder`, languages: { en: "/en/thesis-builder", ar: "/ar/thesis-builder" } },
  };
}

export default async function ThesisBuilderPage({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("builder");
  return (
    <div className="container-page pt-6 pb-10 lg:pt-10">
      <header className="mb-5 max-w-2xl lg:mb-8">
        <h1 className="text-h1 font-semibold text-navy-950 text-balance">{t("title")}</h1>
        <p className="mt-2 text-ink-muted max-lg:hidden">{t("lead")}</p>
      </header>
      <Suspense fallback={<div className="h-[44svh] rounded-2xl bg-navy-50 lg:h-[600px]" />}>
        <ConfiguratorEntry />
      </Suspense>
    </div>
  );
}
