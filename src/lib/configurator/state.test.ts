import { describe, expect, it } from "vitest";
import { calculateQuote } from "@/lib/pricing/quote";
import { initialState, isRtl, switchProduct, toBookConfig, toQuoteInput } from "./state";

describe("configurator state", () => {
  it("initial state of every product prices successfully", () => {
    for (const id of ["regular", "custom", "leather", "luxury-box"] as const) {
      expect(calculateQuote(toQuoteInput(initialState(id))).ok).toBe(true);
    }
  });

  it("switching product keeps valid choices and raises quantity to the new minimum", () => {
    const s = { ...initialState("regular"), quantity: 1 };
    const next = switchProduct(s, "leather");
    expect(next.quantity).toBe(3);
    expect(next.coverColorId).toBe("acero");
    expect(calculateQuote(toQuoteInput(next)).ok).toBe(true);
  });

  it("keeps the print colour when switching to custom design", () => {
    const next = switchProduct({ ...initialState("regular"), foilTone: "silver" }, "custom");
    expect(next.foilTone).toBe("silver");
    expect(calculateQuote(toQuoteInput(next)).ok).toBe(true);
  });

  it("Arabic cover binds right-to-left automatically, overridable", () => {
    const s = { ...initialState(), language: "ar" as const };
    expect(isRtl(s)).toBe(true);
    expect(isRtl({ ...s, direction: "ltr" })).toBe(false);
    expect(isRtl({ ...initialState(), direction: "rtl" })).toBe(true);
  });

  it("English-only cover hides Arabic text and vice versa", () => {
    const base = initialState();
    const text = { ...base.text, title: "Deep Learning", titleAr: "التعلم العميق" };
    const en = toBookConfig({ ...base, text, language: "en" }, { mobile: false });
    expect(en.title).toBe("Deep Learning");
    expect(en.titleArabic).toBe("");
    const ar = toBookConfig({ ...base, text, language: "ar" }, { mobile: false });
    expect(ar.title).toBe("");
    expect(ar.titleArabic).toBe("التعلم العميق");
    expect(ar.rtl).toBe(true);
    const both = toBookConfig({ ...base, text, language: "both" }, { mobile: false });
    expect(both.title).toBe("Deep Learning");
    expect(both.titleArabic).toBe("التعلم العميق");
  });

  it("spine thickness follows page count and printing toggle", () => {
    const s = initialState();
    const thin = toBookConfig({ ...s, printing: { ...s.printing, pages: 60 } }, { mobile: false });
    const thick = toBookConfig({ ...s, printing: { ...s.printing, pages: 600 } }, { mobile: false });
    expect(thick.thickness).toBeGreaterThan(thin.thickness);
    expect(thick.thickness).toBeLessThanOrEqual(60);
  });
});
