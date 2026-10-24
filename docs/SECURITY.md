# Security overview

| Area | How it is protected |
| --- | --- |
| Prices | Calculated on the server from the catalogue for every quote, cart, order and payment. Requests with a client-sent total or unknown fields are rejected. Page count comes from the server's count of the uploaded PDF. |
| Accounts | Better Auth: hashed passwords (min. 10 chars), HTTP-only session cookies (`Secure` on HTTPS), origin checks, database-backed rate limits on sign-in/sign-up. Roles can't be set by users (`FIELD_NOT_ALLOWED`); only `npm run user:role` on the server. No default accounts. |
| Access control | Orders, saved designs and payments are always looked up with the signed-in user's id. Admin pages return 404 to non-staff. Staff APIs re-check the role on every request. |
| CSRF | Same-origin check (Origin / Sec-Fetch-Site) on every state-changing API; Better Auth has its own origin check; cookies are SameSite=Lax. |
| Uploads | PDF only, checked by its bytes (`%PDF-`) and parsed with pdf-lib; password-protected or broken files refused; size capped while streaming (default 50 MB); 10 uploads / 10 min per visitor. Stored outside `public/` with owner-only permissions under a random 128-bit id; the original name is display-only. Only staff can download, as an attachment, and each download is audit-logged. Unattached files are deleted after 7 days. |
| Payments | Stripe Checkout (card data never touches this server). Orders become paid only from a signature-verified webhook whose amount and currency match the order; re-delivered events are ignored; every payment event is audit-logged. Payments recorded by staff (bank transfer, cash) require a note and are audit-logged. |
| Headers | CSP (`frame-ancestors 'none'`, `object-src 'none'`, same-origin connections), HSTS, X-Frame-Options DENY, nosniff, strict Referrer-Policy, Permissions-Policy, COOP. |
| Secrets | Only `NEXT_PUBLIC_*` values reach the browser (site URL, WhatsApp number, Instagram handle). `.env*` files are git-ignored. |
| Audit log | Status changes, delivery fees, payments, notes, file downloads, role changes. |

## Known limits and recommendations

- `script-src 'unsafe-inline'` is allowed in the CSP so pages can stay statically generated (Next.js inline bootstrap). Moving to nonces would make every page dynamic.
- Upload/quote/order rate limits are in memory: fine for one instance; use Redis for several. Uploads are anonymous so customers can try the builder before signing up; a WAF (e.g. Cloudflare) in front adds protection against abuse.
- No email provider yet: email addresses are not verified and password reset is by WhatsApp support. Add one (Resend/Postmark/SES) to enable both.
- `npm audit` reports a moderate esbuild issue inside `drizzle-kit` (a development-only tool used to generate migrations; never runs in production).
- Staff accounts should use strong unique passwords. Two-factor sign-in for staff can be added with Better Auth's two-factor plugin once an email provider exists.
