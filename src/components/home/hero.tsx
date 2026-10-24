"use client";

import { useLayoutEffect, useRef } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import gsap from "gsap";
import { ArrowRight, Languages } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { whatsappLink } from "@/config/site";
import { imageInfo } from "@/lib/images";
import { buttonClasses } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/icons/whatsapp";

const BOOKS = [
  { name: "leather-madera", className: "start-[2%] top-[14%] w-[44%] -rotate-6 z-10" },
  { name: "regular-black-arabic-3", className: "end-[0%] top-[10%] w-[44%] rotate-[7deg] z-10" },
  { name: "regular-navy", className: "start-1/2 top-[2%] w-[52%] -translate-x-1/2 rtl:translate-x-1/2 z-20" },
] as const;

export function Hero() {
  const t = useTranslations();
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from(el.querySelectorAll("[data-hero-text]"), { autoAlpha: 0, y: 20, duration: 0.8, stagger: 0.08 })
        .from(el.querySelectorAll("[data-hero-book]"), { autoAlpha: 0, y: 60, duration: 1.1, stagger: 0.12 }, 0.15);
    });
    return () => mm.revert();
  }, []);

  return (
    <section
      ref={root}
      aria-labelledby="hero-title"
      className="relative overflow-hidden bg-[radial-gradient(120%_80%_at_80%_0%,var(--color-brand-100)_0%,transparent_55%),linear-gradient(180deg,var(--color-canvas),#fff)]"
    >
      <div className="container-page grid items-center gap-10 pt-10 pb-16 md:grid-cols-[1.05fr_1fr] md:gap-6 md:pt-20 md:pb-24 lg:gap-12">
        <div className="max-w-xl">
          <p data-hero-text className="text-sm font-semibold text-brand-700">
            {t("home.eyebrow")}
          </p>
          <h1 id="hero-title" data-hero-text className="mt-3 text-display font-semibold text-navy-950 text-balance">
            {t("home.title")}
          </h1>
          <p data-hero-text className="mt-5 text-lg leading-relaxed text-ink-muted text-pretty sm:text-xl">
            {t("home.lead")}
          </p>
          <div data-hero-text className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/#products" className={buttonClasses("primary", "lg")}>
              {t("home.ctaPrimary")}
              <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
            </Link>
            <a
              href={whatsappLink(t("cta.whatsappGreeting"))}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses("secondary", "lg")}
            >
              <WhatsAppIcon className="size-5 text-[#128C4A]" />
              {t("home.ctaSecondary")}
            </a>
          </div>
          <p data-hero-text className="mt-6 inline-flex items-center gap-2 text-sm text-ink-subtle">
            <Languages className="size-4" aria-hidden="true" />
            {t("home.heroNote")}
          </p>
        </div>

        <div className="relative mx-auto aspect-[1.1] w-full max-w-[34rem]" aria-hidden="true">
          <div className="absolute inset-x-[8%] bottom-[4%] h-[12%] rounded-[50%] bg-navy-900/15 blur-2xl" />
          {BOOKS.map((b, i) => {
            const img = imageInfo(b.name);
            return (
              <div key={b.name} data-hero-book className={`absolute ${b.className}`}>
                <Image
                  src={img.src}
                  alt=""
                  width={img.width}
                  height={img.height}
                  priority={i === 2}
                  sizes="(min-width: 768px) 280px, 50vw"
                  className="h-auto w-full drop-shadow-[0_30px_40px_rgba(11,28,54,0.25)]"
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
