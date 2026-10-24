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
    <footer id="contact" className="mt-24 bg-navy-950 text-navy-100" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="container-page grid gap-12 py-16 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="max-w-sm">
          <Image src="/images/logo-white-480.webp" alt="Book Binding UAE" width={480} height={416} className="h-16 w-auto" />
          <p className="mt-5 text-[0.9375rem] leading-relaxed text-navy-200">{t("footer.tagline")}</p>
          <p className="mt-3 text-sm font-medium text-brand-300">{t("footer.experience")}</p>
        </div>

        <div>
          <h2 className="text-sm font-semibold tracking-wide text-white">{t("footer.linksTitle")}</h2>
          <ul className="mt-4 space-y-2.5">
            {NAV_ITEMS.map((item) => (
              <li key={item.key}>
                <Link href={item.href} className="text-[0.9375rem] text-navy-200 transition-colors hover:text-white">
                  {t(`nav.${item.key}`)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-semibold tracking-wide text-white">{t("footer.contactTitle")}</h2>
          <ul className="mt-4 space-y-3">
            <li>
              <a
                href={whatsappLink(t("cta.whatsappGreeting"))}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 text-[0.9375rem] text-navy-200 transition-colors hover:text-white"
              >
                <WhatsAppIcon className="size-4 shrink-0 text-[#25D366]" />
                <span className="ltr-value">{formatPhone(site.whatsappNumber)}</span>
              </a>
            </li>
            <li>
              <a
                href={site.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 text-[0.9375rem] text-navy-200 transition-colors hover:text-white"
              >
                <InstagramIcon className="size-4 shrink-0" />
                <span className="ltr-value">@{site.instagramHandle}</span>
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-2 py-6 text-sm text-navy-300 sm:flex-row sm:items-center sm:justify-between">
          <p>{t("footer.priceNote")}</p>
          <p>{t("footer.rights", { year })}</p>
        </div>
      </div>
    </footer>
  );
}
