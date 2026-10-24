/** All money is handled as integer fils (1 AED = 100 fils) to avoid float drift. */
export type Fils = number;

export const aed = (amount: number): Fils => Math.round(amount * 100);

export function formatAED(fils: Fils, locale: string = "en"): string {
  const value = fils / 100;
  const formatted = new Intl.NumberFormat(locale === "ar" ? "ar-AE" : "en-AE", {
    minimumFractionDigits: fils % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
    numberingSystem: "latn",
  }).format(value);
  return locale === "ar" ? `${formatted} د.إ` : `AED ${formatted}`;
}
