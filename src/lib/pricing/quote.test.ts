import { describe, expect, it } from "vitest";
import { calculateQuote, type QuoteInput } from "./quote";
import { formatAED } from "./money";

const box: QuoteInput = {
  productId: "luxury-box",
  quantity: 2,
  coverColorId: "madera",
  boxColorId: "acero",
  foilTone: "gold",
};

function ok(input: QuoteInput) {
  const r = calculateQuote(input);
  if (!r.ok) throw new Error(JSON.stringify(r.error));
  return r.quote;
}

describe("cover / binding price", () => {
  it("luxury box: AED 1,000 per bundle, confirmed", () => {
    const q = ok(box);
    expect(q.coverSubtotal).toBe(200000);
    expect(q.subtotal).toBe(200000);
    expect(q.hasUnconfirmedPrices).toBe(false);
  });

  it("luxury box: enforces minimum of 2 bundles", () => {
    const r = calculateQuote({ ...box, quantity: 1 });
    expect(r).toEqual({ ok: false, error: { code: "below_minimum", minQty: 2 } });
  });

  it("regular: AED 120 for one copy, AED 100 each from two (unconfirmed)", () => {
    const one = ok({ productId: "regular", quantity: 1, coverColorId: "black", foilTone: "gold" });
    expect(one.coverSubtotal).toBe(12000);
    expect(one.hasUnconfirmedPrices).toBe(true);
    const three = ok({ productId: "regular", quantity: 3, coverColorId: "black", foilTone: "silver" });
    expect(three.coverSubtotal).toBe(30000);
  });

  it("leather: minimum 3 books at AED 300", () => {
    expect(calculateQuote({ productId: "leather", quantity: 2, coverColorId: "acero", foilTone: "gold" }).ok).toBe(false);
    expect(ok({ productId: "leather", quantity: 3, coverColorId: "acero", foilTone: "gold" }).coverSubtotal).toBe(90000);
  });
});

describe("interior printing is separate from cover price", () => {
  const base: QuoteInput = { productId: "regular", quantity: 2, coverColorId: "navy", foilTone: "gold" };

  it.each([
    ["80gsm", "color", 50],
    ["80gsm", "bw", 20],
    ["120gsm", "color", 100],
    ["120gsm", "bw", 50],
  ] as const)("%s %s = %i fils per page", (paper, mode, rate) => {
    const q = ok({ ...base, printing: { pages: 120, paper, mode } });
    const line = q.lines.find((l) => l.kind === "printing")!;
    expect(line.ratePerPage).toBe(rate);
    expect(line.total).toBe(120 * rate * 2);
    expect(q.printingSubtotal).toBe(120 * rate * 2);
    expect(q.coverSubtotal).toBe(20000);
    expect(q.subtotal).toBe(20000 + 120 * rate * 2);
  });

  it("no printing line when printing is not requested", () => {
    const q = ok(base);
    expect(q.lines.some((l) => l.kind === "printing")).toBe(false);
    expect(q.printingSubtotal).toBe(0);
  });

  it("flags estimated page counts until the server counts the PDF", () => {
    expect(ok({ ...base, printing: { pages: 10, paper: "80gsm", mode: "bw" } }).pageCountIsEstimate).toBe(true);
    expect(
      ok({ ...base, printing: { pages: 10, paper: "80gsm", mode: "bw", pageCountSource: "pdf" } }).pageCountIsEstimate,
    ).toBe(false);
  });
});

describe("add-ons", () => {
  it("spine +20 and corners +5 per book", () => {
    const q = ok({ ...box, quantity: 2, spinePrinting: true, corners: "silver" });
    expect(q.addonsSubtotal).toBe(2 * 2000 + 2 * 500);
    expect(q.subtotal).toBe(200000 + 5000);
  });
});

describe("validation", () => {
  it("rejects a colour the product does not offer", () => {
    expect(calculateQuote({ ...box, coverColorId: "maroon" })).toEqual({ ok: false, error: { code: "invalid_color" } });
  });
  it("requires a box colour for the box set", () => {
    expect(calculateQuote({ ...box, boxColorId: undefined }).ok).toBe(false);
  });
  it("requires a foil tone where the product uses foil/screen", () => {
    expect(calculateQuote({ ...box, foilTone: undefined }).ok).toBe(false);
  });
  it("rejects a foil tone for custom digital print", () => {
    expect(calculateQuote({ productId: "custom", quantity: 1, coverColorId: "black", foilTone: "gold" }).ok).toBe(false);
  });
  it.each([0, -1, 1.5, 501])("rejects quantity %s", (quantity) => {
    expect(calculateQuote({ ...box, quantity }).ok).toBe(false);
  });
  it.each([0, 2001, 10.5])("rejects page count %s", (pages) => {
    expect(calculateQuote({ ...box, printing: { pages, paper: "80gsm", mode: "bw" } }).ok).toBe(false);
  });
  it("ignores unknown fields like a client-sent total", () => {
    const q = ok({ ...box, total: 1 } as QuoteInput);
    expect(q.subtotal).toBe(200000);
  });
  it("rejects garbage", () => {
    expect(calculateQuote(null).ok).toBe(false);
    expect(calculateQuote({ productId: "other" }).ok).toBe(false);
  });
});

describe("formatting", () => {
  it("formats AED", () => {
    expect(formatAED(200000)).toBe("AED 2,000");
    expect(formatAED(2460)).toBe("AED 24.60");
    expect(formatAED(2460, "ar")).toBe("24.60 د.إ");
  });
});
