import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthForm } from "@/components/account/auth-form";
import { redirect } from "@/i18n/navigation";
import { currentSession } from "@/lib/auth";
import { safeNext } from "@/lib/safe-next";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ next?: string | string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return { title: t("signInMeta"), robots: { index: false } };
}

export default async function Page({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const next = safeNext((await searchParams).next);
  if (await currentSession()) redirect({ href: next, locale });
  const t = await getTranslations("auth");
  return (
    <div className="container-page flex justify-center py-12 lg:py-20">
      <div className="w-full max-w-md">
        <h1 className="text-h2 font-semibold text-navy-950">{t("signInTitle")}</h1>
        <p className="mt-2 text-ink-muted">{t("signInLead")}</p>
        <div className="mt-8 rounded-2xl bg-white p-6 ring-1 ring-line sm:p-8">
          <AuthForm mode="sign-in" next={next} />
        </div>
      </div>
    </div>
  );
}
