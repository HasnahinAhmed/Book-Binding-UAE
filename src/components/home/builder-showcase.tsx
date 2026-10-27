import Image from "next/image";
import { useTranslations } from "next-intl";
import { ArrowRight, Box, Check } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { imageInfo } from "@/lib/images";
import { buttonClasses } from "@/components/ui/button";
import { ORDER_HREF } from "@/components/layout/nav-items";

/** "See it before you order": sells the 3D builder, which is also the order flow. */
export function BuilderShowcase() {
  const t = useTranslations("home");
  const front = imageInfo("custom-navy-1");
  const back = imageInfo("regular-black-arabic-3");

  return (
    <section aria-labelledby="builder-title" className="py-20 md:py-28">
      <div className="container-page grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div
          className="relative order-last aspect-[5/4] overflow-hidden rounded-[2rem] bg-canvas lg:order-first"
          data-reveal
          aria-hidden="true"
        >
          <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_45%,var(--color-brand-100),transparent)]" />
          <Image
            src={back.src}
            alt=""
            width={back.width}
            height={back.height}
            sizes="(min-width: 1024px) 260px, 40vw"
            className="absolute top-[14%] start-[12%] h-auto w-[38%] -rotate-6 drop-shadow-[0_24px_30px_rgba(11,28,54,0.22)]"
          />
          <Image
            src={front.src}
            alt=""
            width={front.width}
            height={front.height}
            sizes="(min-width: 1024px) 300px, 48vw"
            className="absolute top-[8%] end-[14%] h-auto w-[44%] rotate-3 drop-shadow-[0_30px_40px_rgba(11,28,54,0.28)]"
          />
          <p className="glass absolute bottom-5 start-5 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-ink">
            <Box className="size-4 text-brand-700" />
            {t("livePreview")}
          </p>
        </div>

        <div className="max-w-xl" data-reveal>
          <p className="text-sm font-semibold tracking-wide text-ink-subtle uppercase">{t("builderEyebrow")}</p>
          <h2 id="builder-title" className="mt-2 text-h2 font-semibold text-heading text-balance">
            {t("builderTitle")}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-ink-muted text-pretty">{t("builderLead")}</p>
          <ul className="mt-8 space-y-3">
            {(["builderPoint1", "builderPoint2", "builderPoint3"] as const).map((k) => (
              <li key={k} className="flex items-start gap-3 text-ink">
                <Check className="mt-0.5 size-5 shrink-0 text-brand-600" aria-hidden="true" />
                {t(k)}
              </li>
            ))}
          </ul>
          <Link href={ORDER_HREF} className={buttonClasses("primary", "lg", "mt-10")}>
            {t("ctaBuilder")}
            <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
