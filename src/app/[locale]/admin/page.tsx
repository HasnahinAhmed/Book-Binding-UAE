import { setRequestLocale } from "next-intl/server";
import { DemoNotice } from "@/components/demo/demo-notice";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <DemoNotice locale={locale} area="admin" />;
}
