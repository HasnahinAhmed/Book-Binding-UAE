import { setRequestLocale } from "next-intl/server";
import { Hero } from "@/components/home/hero";
import { CategoryCards } from "@/components/home/category-cards";
import { PricingExplainer } from "@/components/home/pricing-explainer";
import { Addons } from "@/components/home/addons";
import { Bilingual } from "@/components/home/bilingual";
import { Steps } from "@/components/home/steps";
import { CtaBand } from "@/components/home/cta-band";
import { Reveal } from "@/components/motion/reveal";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <>
      <Hero />
      <Reveal>
        <CategoryCards />
        <PricingExplainer />
        <Addons />
        <Bilingual />
        <Steps />
        <CtaBand />
      </Reveal>
    </>
  );
}
