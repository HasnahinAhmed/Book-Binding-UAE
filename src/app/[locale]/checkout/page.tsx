import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CheckoutForm } from "@/components/cart/checkout-form";
import { redirect } from "@/i18n/navigation";
import { currentSession } from "@/lib/auth";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "checkout" });
  return { title: t("metaTitle"), robots: { index: false } };
}

export default async function CheckoutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await currentSession();
  if (!session) return redirect({ href: "/account/sign-in?next=/checkout", locale });
  const t = await getTranslations("checkout");
  return (
    <div className="container-page py-10 lg:py-14">
      <h1 className="text-h2 font-semibold text-heading">{t("title")}</h1>
      <div className="mt-8">
        <CheckoutForm defaultName={session.user.name} email={session.user.email} />
      </div>
    </div>
  );
}
