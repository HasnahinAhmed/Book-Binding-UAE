"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Languages } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

/** Switches EN ⇄ AR while staying on the same page (and keeping the query). */
export function LanguageSwitch({ className }: { className?: string }) {
  const t = useTranslations("lang");
  const locale = useLocale();
  const pathname = usePathname();
  const search = useSearchParams();
  const target = locale === "ar" ? "en" : "ar";
  const query = Object.fromEntries(search.entries());

  return (
    <Link
      href={{ pathname, query }}
      locale={target}
      hrefLang={target}
      aria-label={t("switchLabel")}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-navy-900 hover:bg-navy-50",
        className,
      )}
    >
      <Languages className="size-4" aria-hidden="true" />
      <span lang={target}>{t("switchTo")}</span>
    </Link>
  );
}
