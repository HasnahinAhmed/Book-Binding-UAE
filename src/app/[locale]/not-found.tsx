import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buttonClasses } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations("notFound");
  return (
    <div className="container-page flex min-h-[50vh] flex-col items-center justify-center py-20 text-center">
      <p className="text-sm font-semibold text-brand-700">404</p>
      <h1 className="mt-2 text-h2 font-semibold text-heading">{t("title")}</h1>
      <p className="mt-3 max-w-md text-ink-muted">{t("body")}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/" className={buttonClasses("primary", "md")}>
          {t("home")}
        </Link>
        <Link href="/thesis-builder" className={buttonClasses("secondary", "md")}>
          {t("builder")}
        </Link>
      </div>
    </div>
  );
}
