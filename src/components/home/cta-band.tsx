import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { whatsappLink } from "@/config/site";
import { buttonClasses } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/icons/whatsapp";
import { ORDER_HREF } from "@/components/layout/nav-items";

export function CtaBand() {
  const t = useTranslations();
  return (
    <section aria-labelledby="cta-title" className="container-page py-8">
      <div
        className="relative overflow-hidden rounded-[2rem] bg-canvas px-6 py-14 text-center ring-1 ring-line sm:px-10 md:py-20"
        data-reveal
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-full bg-[radial-gradient(50%_70%_at_50%_0%,var(--color-brand-100),transparent)]"
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-2xl">
          <h2 id="cta-title" className="text-h2 font-semibold text-heading text-balance">
            {t("home.ctaBandTitle")}
          </h2>
          <p className="mt-3 text-lg text-ink-muted text-pretty">{t("home.ctaBandLead")}</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href={ORDER_HREF} className={buttonClasses("primary", "lg")}>
              {t("cta.orderOnline")}
              <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
            </Link>
            <a
              href={whatsappLink(t("cta.whatsappGreeting"))}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses("whatsapp", "lg")}
            >
              <WhatsAppIcon className="size-5" />
              {t("cta.whatsapp")}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
