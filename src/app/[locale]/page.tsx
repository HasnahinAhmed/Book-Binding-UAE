import { setRequestLocale } from "next-intl/server";
import { Hero } from "@/components/home/hero";
import { CategoryCards } from "@/components/home/category-cards";
import { BuilderShowcase } from "@/components/home/builder-showcase";
import { PricingNote } from "@/components/home/pricing-note";
import { Addons } from "@/components/home/addons";
import { Bilingual } from "@/components/home/bilingual";
import { Steps } from "@/components/home/steps";
import { CtaBand } from "@/components/home/cta-band";
import { Reveal } from "@/components/motion/reveal";

/**
 * Homepage order: what it is (hero) → what you can choose → see it before you
 * order → how the price works → how ordering works → extras → final CTA.
 * No price tables here; exact prices appear in the builder and product pages.
 */
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <>
      <Hero />
      <Reveal>
        <CategoryCards />
        <BuilderShowcase />
        <PricingNote />
        <Steps />
        <Bilingual />
        <Addons />
        <CtaBand />
      </Reveal>
    </>
  );
}
