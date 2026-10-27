import Image from "next/image";
import { useTranslations } from "next-intl";
import { imageInfo } from "@/lib/images";

const SAMPLES = ["regular-black-arabic-2", "regular-black-arabic-1", "regular-maroon"] as const;

export function Bilingual() {
  const t = useTranslations();
  return (
    <section aria-labelledby="bilingual-title" className="overflow-hidden py-20 md:py-28">
      <div className="container-page grid items-center gap-12 rounded-[2rem] lg:grid-cols-[1fr_1.2fr]">
        <div data-reveal>
          <p className="text-sm font-semibold tracking-wide text-ink-subtle uppercase">{t("home.bilingualEyebrow")}</p>
          <h2 id="bilingual-title" className="mt-2 text-h2 font-semibold text-heading text-balance">
            {t("home.bilingualTitle")}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-ink-muted text-pretty">{t("home.bilingualLead")}</p>
        </div>
        <ul className="grid grid-cols-3 items-end gap-3 rounded-[2rem] bg-canvas px-4 pt-12 pb-8 sm:gap-6 sm:px-8" data-reveal-group>
          {SAMPLES.map((name, i) => {
            const img = imageInfo(name);
            return (
              <li key={name} className={i === 1 ? "-translate-y-6" : ""}>
                <Image
                  src={img.src}
                  alt={t("home.sampleAlt", { desc: t(`samples.${name}`) })}
                  width={img.width}
                  height={img.height}
                  sizes="(min-width: 1024px) 220px, 30vw"
                  className="h-auto w-full drop-shadow-[0_20px_24px_rgba(11,28,54,0.25)]"
                />
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
