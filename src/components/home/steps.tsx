import { useTranslations } from "next-intl";
import { SectionHeading } from "@/components/ui/section-heading";

export function Steps() {
  const t = useTranslations("home");
  return (
    <section id="how-it-works" aria-labelledby="steps-title" className="container-page scroll-mt-20 py-20 md:py-28">
      <SectionHeading id="steps-title" eyebrow={t("stepsEyebrow")} title={t("stepsTitle")} />
      <ol className="mt-12 grid gap-5 md:grid-cols-3" data-reveal-group>
        {([1, 2, 3] as const).map((n) => (
          <li key={n} className="rounded-xl bg-canvas p-6 ring-1 ring-line">
            <span className="flex size-10 items-center justify-center rounded-full bg-navy-900 text-sm font-semibold text-white" aria-hidden="true">
              {n}
            </span>
            <h3 className="mt-5 text-lg font-semibold text-navy-950">{t(`step${n}`)}</h3>
            <p className="mt-2 leading-relaxed text-ink-muted">{t(`step${n}Desc`)}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
