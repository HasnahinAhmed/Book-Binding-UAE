import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CartView } from "@/components/cart/cart-view";
import { currentSession } from "@/lib/auth";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "cart" });
  return { title: t("metaTitle"), robots: { index: false } };
}

export default async function CartPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, session] = [await getTranslations("cart"), await currentSession()];
  return (
    <div className="container-page py-10 lg:py-14">
      <h1 className="text-h2 font-semibold text-heading">{t("title")}</h1>
      <div className="mt-8">
        <CartView signedIn={!!session} />
      </div>
    </div>
  );
}
