import { z } from "zod";
import { designSchema, MAX_CART_ITEMS } from "@/lib/cart/schema";
import { quoteRequestSchema } from "@/lib/quote/server-quote";

export const EMIRATES = ["abu-dhabi", "dubai", "sharjah", "ajman", "umm-al-quwain", "ras-al-khaimah", "fujairah"] as const;

/** Normalises a phone number to digits with country code. UAE local numbers (05x…) become 9715x…. */
export function normalisePhone(input: string): string | null {
  let digits = input.replace(/[^\d]/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (/^05\d{8}$/.test(digits)) digits = `971${digits.slice(1)}`;
  if (/^5\d{8}$/.test(digits)) digits = `971${digits}`;
  return /^[1-9]\d{7,14}$/.test(digits) ? digits : null;
}

export const checkoutSchema = z
  .object({
    requestId: z.string().regex(/^[A-Za-z0-9-]{16,64}$/),
    locale: z.enum(["en", "ar"]),
    items: z
      .array(z.object({ request: quoteRequestSchema, design: designSchema.nullable().default(null) }).strict())
      .min(1)
      .max(MAX_CART_ITEMS),
    contact: z
      .object({
        name: z.string().trim().min(2).max(100),
        phone: z.string().max(30).transform((v, ctx) => {
          const n = normalisePhone(v);
          if (!n) {
            ctx.addIssue({ code: "custom", message: "invalid_phone" });
            return z.NEVER;
          }
          return n;
        }),
      })
      .strict(),
    fulfilment: z.enum(["delivery", "collection"]),
    emirate: z.enum(EMIRATES).optional(),
    address: z.string().trim().max(500).optional(),
    note: z.string().trim().max(1000).optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.fulfilment === "delivery") {
      if (!v.emirate) ctx.addIssue({ code: "custom", path: ["emirate"], message: "required" });
      if (!v.address || v.address.length < 8) ctx.addIssue({ code: "custom", path: ["address"], message: "required" });
    }
  });

export type CheckoutInput = z.input<typeof checkoutSchema>;
