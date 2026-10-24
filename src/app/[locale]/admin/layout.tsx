import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Shield } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { requireStaffPage } from "@/lib/admin/guard";

type Props = { children: React.ReactNode; params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

export default async function AdminLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireStaffPage(locale, "/admin");
  const t = await getTranslations("admin");
  return (
    <div className="container-page py-8 lg:py-10">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-line pb-4">
        <p className="flex items-center gap-2 text-lg font-semibold text-navy-950">
          <Shield className="size-5 text-brand-600" aria-hidden="true" />
          {t("title")}
        </p>
        <nav aria-label={t("title")} className="flex gap-1">
          <Link href="/admin" className="rounded-full px-3 py-1.5 text-sm font-medium text-ink-muted hover:bg-navy-50 hover:text-navy-950">
            {t("orders")}
          </Link>
          <Link href="/admin/prices" className="rounded-full px-3 py-1.5 text-sm font-medium text-ink-muted hover:bg-navy-50 hover:text-navy-950">
            {t("prices")}
          </Link>
        </nav>
        <p className="ms-auto text-sm text-ink-subtle" dir="auto">
          {session.user.name}
        </p>
      </div>
      <div className="pt-6">{children}</div>
    </div>
  );
}
