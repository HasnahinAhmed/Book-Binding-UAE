// Public, non-secret business settings. Checked at startup so a typo in the
// environment fails loudly instead of producing broken links. (No zod here:
// this file is used by the header on every page, so it stays tiny.)
function check(name: string, value: string | undefined, fallback: string, valid: (v: string) => boolean): string {
  const v = value || fallback;
  if (!valid(v)) throw new Error(`Invalid ${name}: ${v}`);
  return v;
}

const env = {
  NEXT_PUBLIC_SITE_URL: check("NEXT_PUBLIC_SITE_URL", process.env.NEXT_PUBLIC_SITE_URL, "http://localhost:3000", (v) => /^https?:\/\/[^\s/]+(:\d+)?$/.test(v)),
  NEXT_PUBLIC_WHATSAPP_NUMBER: check("NEXT_PUBLIC_WHATSAPP_NUMBER", process.env.NEXT_PUBLIC_WHATSAPP_NUMBER, "971525294086", (v) => /^\d{8,15}$/.test(v)),
  NEXT_PUBLIC_INSTAGRAM_HANDLE: check("NEXT_PUBLIC_INSTAGRAM_HANDLE", process.env.NEXT_PUBLIC_INSTAGRAM_HANDLE, "book_binding_uae", (v) => /^[A-Za-z0-9._]+$/.test(v)),
};

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
