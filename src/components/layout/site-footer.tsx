import Image from "next/image";
import { useTranslations } from "next-intl";
import { InstagramIcon } from "@/components/icons/instagram";
import { Link } from "@/i18n/navigation";
import { formatPhone, site, whatsappLink } from "@/config/site";
import { WhatsAppIcon } from "@/components/icons/whatsapp";
import { NAV_ITEMS } from "./nav-items";

export function SiteFooter() {
  const t = useTranslations();
  const year = new Date().getFullYear();

  return (
    <footer id="contact" className="mt-24 border-t border-line bg-white text-ink" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="container-page grid gap-12 py-16 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="max-w-sm">
          <Image src="/images/logo-horizontal-480.webp" alt="Book Binding UAE" width={480} height={206} className="h-10 w-auto" />
          <p className="mt-5 text-[0.9375rem] leading-relaxed text-ink-muted">{t("footer.tagline")}</p>
          <p className="mt-3 text-sm font-medium text-brand-700">{t("footer.experience")}</p>
        </div>

        <div>
          <h2 className="text-sm font-semibold tracking-wide text-ink">{t("footer.linksTitle")}</h2>
          <ul className="mt-4 space-y-2.5">
            {NAV_ITEMS.map((item) => (
              <li key={item.key}>
                <Link href={item.href} className="text-[0.9375rem] text-ink-muted transition-colors hover:text-brand-700">
                  {t(`nav.${item.key}`)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-semibold tracking-wide text-ink">{t("footer.contactTitle")}</h2>
          <ul className="mt-4 space-y-3">
            <li>
              <a
                href={whatsappLink(t("cta.whatsappGreeting"))}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 text-[0.9375rem] text-ink-muted transition-colors hover:text-brand-700"
              >
                <WhatsAppIcon className="size-4 shrink-0 text-[#0F7A40]" />
                <span className="ltr-value">{formatPhone(site.whatsappNumber)}</span>
              </a>
            </li>
            <li>
              <a
                href={site.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 text-[0.9375rem] text-ink-muted transition-colors hover:text-brand-700"
              >
                <InstagramIcon className="size-4 shrink-0" />
                <span className="ltr-value">@{site.instagramHandle}</span>
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="container-page flex flex-col gap-2 py-6 text-sm text-ink-subtle sm:flex-row sm:items-center sm:justify-between">
          <p>{t("footer.priceNote")}</p>
          <p>{t("footer.rights", { year })}</p>
        </div>
      </div>
    </footer>
  );
}
