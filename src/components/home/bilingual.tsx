import Image from "next/image";
import { useTranslations } from "next-intl";
import { imageInfo } from "@/lib/images";

const SAMPLES = ["regular-black-arabic-2", "regular-black-arabic-1", "regular-maroon"] as const;

export function Bilingual() {
  const t = useTranslations();
  return (
    <section aria-labelledby="bilingual-title" className="overflow-hidden bg-navy-950 py-20 text-white md:py-28">
      <div className="container-page grid items-center gap-12 lg:grid-cols-[1fr_1.2fr]">
        <div data-reveal>
          <p className="text-sm font-semibold text-brand-300">{t("home.bilingualEyebrow")}</p>
          <h2 id="bilingual-title" className="mt-2 text-h2 font-semibold text-balance">
            {t("home.bilingualTitle")}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-navy-200 text-pretty">{t("home.bilingualLead")}</p>
        </div>
        <ul className="grid grid-cols-3 items-end gap-3 sm:gap-6" data-reveal-group>
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
                  className="h-auto w-full drop-shadow-[0_24px_30px_rgba(0,0,0,0.45)]"
                />
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
