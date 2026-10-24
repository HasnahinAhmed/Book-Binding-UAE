import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import ar from "../../messages/ar.json";

function keys(obj: object, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) => (v && typeof v === "object" ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]));
}

describe("translations", () => {
  it("Arabic has every English key and no extras", () => {
    const e = new Set(keys(en));
    const a = new Set(keys(ar));
    expect([...e].filter((k) => !a.has(k))).toEqual([]);
    expect([...a].filter((k) => !e.has(k))).toEqual([]);
  });
  it("no Arabic string is left in English", () => {
    const flat = (o: object): [string, string][] =>
      keys(o).map((k) => [k, k.split(".").reduce<unknown>((x, p) => (x as Record<string, unknown>)[p], o) as string]);
    // placeholders for the English cover fields are English on purpose
    const englishOnPurpose = new Set(["builder.placeholders.university", "builder.placeholders.title", "builder.placeholders.author"]);
    const same = flat(ar).filter(([k, v]) => {
      if (englishOnPurpose.has(k)) return false;
      const enV = k.split(".").reduce<unknown>((x, p) => (x as Record<string, unknown>)?.[p], en);
      return typeof v === "string" && v === enV && /[a-z]{4,}/i.test(v.replace(/\{[^}]+\}|GSM|PDF|PU|AED|WhatsApp|Instagram|Stripe|Apple Pay|Google Pay|Book Binding UAE/g, ""));
    });
    expect(same.map(([k]) => k)).toEqual([]);
  });
});
