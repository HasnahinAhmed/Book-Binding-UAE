"use client";

import { useLayoutEffect, useRef } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import gsap from "gsap";
import { ArrowRight, Check } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { whatsappLink } from "@/config/site";
import { ORDER_HREF } from "@/components/layout/nav-items";
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
      className="relative overflow-hidden bg-white"
    >
      <div className="container-page grid items-center gap-10 pt-8 pb-16 md:min-h-[min(82svh,46rem)] md:grid-cols-[1.05fr_1fr] md:gap-6 md:pt-12 md:pb-20 lg:gap-12">
        <div className="max-w-xl">
          <p data-hero-text className="text-sm font-semibold tracking-wide text-ink-subtle uppercase">
            {t("home.eyebrow")}
          </p>
          <h1 id="hero-title" data-hero-text className="mt-3 text-display font-semibold text-heading text-balance">
            {t("home.title")}
          </h1>
          <p data-hero-text className="mt-5 text-lg leading-relaxed text-ink-muted text-pretty sm:text-xl">
            {t("home.lead")}
          </p>
          <div data-hero-text className="mt-8 flex flex-col gap-3 sm:flex-row">
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
              {t("home.ctaSecondary")}
            </a>
          </div>
          <ul data-hero-text className="mt-8 grid gap-2.5 text-[0.9375rem] text-ink sm:grid-cols-1">
            {(["proof1", "proof2", "proof3"] as const).map((k) => (
              <li key={k} className="flex items-center gap-2.5">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700" aria-hidden="true">
                  <Check className="size-3.5" strokeWidth={2.5} />
                </span>
                {t(`home.${k}`)}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mx-auto aspect-[1.3] w-full max-w-[34rem] md:aspect-[1.1]" aria-hidden="true">
          <div className="absolute inset-[6%] rounded-full bg-[radial-gradient(closest-side,var(--color-brand-100),transparent)] opacity-80" />
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
