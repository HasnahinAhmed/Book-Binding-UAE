import type { ConfiguratorState } from "./state";

type T = (key: string, values?: Record<string, string | number>) => string;

/** Cover-text lines appended to the WhatsApp order message. */
export function coverTextLines(s: ConfiguratorState, t: T): string[] {
  const keys = ["university", "universityAr", "college", "title", "titleAr", "author", "authorAr", "supervisor", "year"] as const;
  const lines = keys
    .filter((k) => s.text[k].trim())
    .map((k) => `${t(`builder.fields.${k}`)}: ${s.text[k].trim()}`);
  const lang = { en: "builder.langEn", ar: "builder.langAr", both: "builder.langBoth" }[s.language];
  return ["", `${t("builder.language")}: ${t(lang)}`, ...lines];
}
