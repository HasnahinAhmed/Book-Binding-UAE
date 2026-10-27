import Image from "next/image";
import { useTranslations } from "next-intl";
import { imageInfo } from "@/lib/images";
import { SectionHeading } from "@/components/ui/section-heading";

export function Addons() {
  const t = useTranslations();
  const items = [
    { key: "Spine", img: "spine-diagram" },
    { key: "Corners", img: "detail-corner-gold" },
  ] as const;

  return (
    <section aria-labelledby="addons-title" className="container-page py-20 md:py-28">
      <SectionHeading id="addons-title" eyebrow={t("home.addonsEyebrow")} title={t("home.addonsTitle")} />
      <ul className="mt-12 grid gap-5 md:grid-cols-2" data-reveal-group>
        {items.map((a) => {
          const img = imageInfo(a.img);
          return (
            <li key={a.key} className="flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-line sm:flex-row">
              <div className="relative aspect-[4/3] bg-navy-50 sm:aspect-auto sm:w-[45%]">
                <Image
                  src={img.src}
                  alt={t(`samples.${a.img}`)}
                  fill
                  sizes="(min-width: 768px) 280px, 100vw"
                  className="object-cover"
                />
              </div>
              <div className="flex flex-1 flex-col justify-center p-6">
                <h3 className="text-lg font-semibold text-ink">{t(`home.addon${a.key}`)}</h3>
                <p className="mt-1.5 text-ink-muted">{t(`home.addon${a.key}Desc`)}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
