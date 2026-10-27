import { useTranslations } from "next-intl";
import { SectionHeading } from "@/components/ui/section-heading";

export function Steps() {
  const t = useTranslations("home");
  return (
    <section id="how-it-works" aria-labelledby="steps-title" className="container-page scroll-mt-20 py-20 md:py-28">
      <SectionHeading id="steps-title" eyebrow={t("stepsEyebrow")} title={t("stepsTitle")} />
      <ol className="relative mt-14 grid gap-10 md:grid-cols-3 md:gap-8" data-reveal-group>
        {([1, 2, 3] as const).map((n) => (
          <li key={n} className="relative ps-14 md:ps-0">
            {/* connecting line: vertical on mobile, horizontal on desktop */}
            {n < 3 && (
              <span
                className="absolute top-10 bottom-[-2.5rem] start-5 w-px bg-line md:top-5 md:start-12 md:end-[-2rem] md:bottom-auto md:h-px md:w-auto"
                aria-hidden="true"
              />
            )}
            <span
              className="absolute top-0 start-0 flex size-10 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white md:static"
              aria-hidden="true"
            >
              {n}
            </span>
            <h3 className="text-lg font-semibold text-ink md:mt-6">{t(`step${n}`)}</h3>
            <p className="mt-2 leading-relaxed text-ink-muted">{t(`step${n}Desc`)}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
