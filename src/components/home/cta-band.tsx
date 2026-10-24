import { useTranslations } from "next-intl";
import { whatsappLink } from "@/config/site";
import { buttonClasses } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/icons/whatsapp";

export function CtaBand() {
  const t = useTranslations();
  return (
    <section aria-labelledby="cta-title" className="container-page">
      <div
        className="flex flex-col items-start gap-6 rounded-2xl bg-[linear-gradient(135deg,var(--color-brand-600),var(--color-navy-800))] px-6 py-10 text-white sm:px-10 md:flex-row md:items-center md:justify-between md:py-12"
        data-reveal
      >
        <div className="max-w-xl">
          <h2 id="cta-title" className="text-2xl font-semibold text-balance sm:text-3xl">
            {t("home.ctaBandTitle")}
          </h2>
          <p className="mt-2 text-brand-100">{t("home.ctaBandLead")}</p>
        </div>
        <a
          href={whatsappLink(t("cta.whatsappGreeting"))}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClasses("secondary", "lg", "shrink-0")}
        >
          <WhatsAppIcon className="size-5 text-[#128C4A]" />
          {t("cta.whatsapp")}
        </a>
      </div>
    </section>
  );
}
