"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import type { ImageInfo } from "@/lib/images";
import { cn } from "@/lib/cn";

export function Gallery({ images }: { images: (ImageInfo & { name: string; alt: string })[] }) {
  const t = useTranslations("order");
  const [active, setActive] = useState(0);
  const current = images[active]!;
  const isPhoto = current.name === "box-workshop" || current.name === "leather-swatches";

  return (
    <div>
      <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-[linear-gradient(160deg,var(--color-navy-50),var(--color-brand-50))]">
        <Image
          key={current.name}
          src={current.src}
          alt={current.alt}
          width={current.width}
          height={current.height}
          priority
          sizes="(min-width: 1024px) 560px, 100vw"
          className={cn(
            isPhoto ? "h-full w-full object-cover" : "h-[88%] w-auto object-contain drop-shadow-[0_24px_32px_rgba(11,28,54,0.25)]",
          )}
        />
      </div>
      {images.length > 1 && (
        <ul className="mt-4 flex gap-3 overflow-x-auto pb-1" aria-label={t("gallery")}>
          {images.map((img, i) => (
            <li key={img.name}>
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={t("showImage", { n: i + 1 })}
                aria-current={i === active}
                className={cn(
                  "relative flex size-20 items-center justify-center overflow-hidden rounded-xl bg-navy-50 ring-1 ring-line transition-shadow",
                  i === active && "ring-2 ring-brand-600",
                )}
              >
                <Image src={img.src} alt="" width={img.width} height={img.height} sizes="80px" className="h-[85%] w-auto object-contain" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
