import { z } from "zod";

// Public, non-secret business settings. Validated at startup so a typo in
// the environment fails loudly instead of producing broken links.
const schema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
  NEXT_PUBLIC_WHATSAPP_NUMBER: z
    .string()
    .regex(/^\d{8,15}$/, "digits only, with country code")
    .default("971525294086"),
  NEXT_PUBLIC_INSTAGRAM_HANDLE: z.string().regex(/^[A-Za-z0-9._]+$/).default("book_binding_uae"),
});

const env = schema.parse({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || undefined,
  NEXT_PUBLIC_WHATSAPP_NUMBER: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || undefined,
  NEXT_PUBLIC_INSTAGRAM_HANDLE: process.env.NEXT_PUBLIC_INSTAGRAM_HANDLE || undefined,
});

export const site = {
  name: "Book Binding UAE",
  url: env.NEXT_PUBLIC_SITE_URL,
  whatsappNumber: env.NEXT_PUBLIC_WHATSAPP_NUMBER,
  instagramHandle: env.NEXT_PUBLIC_INSTAGRAM_HANDLE,
  instagramUrl: `https://www.instagram.com/${env.NEXT_PUBLIC_INSTAGRAM_HANDLE}/`,
} as const;

/** "+971 52 942 7423" style display for a UAE mobile number. */
export function formatPhone(digits: string): string {
  const m = /^971(\d{2})(\d{3})(\d{4})$/.exec(digits);
  return m ? `+971 ${m[1]} ${m[2]} ${m[3]}` : `+${digits}`;
}

export function whatsappLink(text?: string): string {
  const base = `https://wa.me/${site.whatsappNumber}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
