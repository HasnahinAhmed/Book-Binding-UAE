# Deployment

## 1. Choose hosting

The app is a standard Node.js server (`npm run build && npm start`) plus PostgreSQL.

**Uploaded thesis PDFs are stored on the server's disk** (`STORAGE_LOCAL_DIR`). That needs a host with a **persistent disk**:

| Option | Fits now? | Notes |
| --- | --- | --- |
| VPS (e.g. Hetzner, DigitalOcean) with Node 22 + nginx/Caddy | Yes | Cheapest; you manage updates and backups |
| Render / Railway / Fly.io with a persistent volume | Yes | Managed; attach a volume and point `STORAGE_LOCAL_DIR` at it; run one instance |
| Vercel / serverless | Not yet | No persistent disk. Needs an S3/R2 storage driver (interface ready in `src/lib/storage/types.ts`, driver not written) |

Run **one app instance** for now: the API rate limiters for uploads/quotes/orders live in memory (sign-in limits are already in the database). For several instances, move them to Redis.

## 2. Database

Managed PostgreSQL 14+ (Neon, Supabase, RDS, or on the VPS). Create a database and a user that owns it, then:

```bash
DATABASE_URL=postgresql://... npm run db:migrate
```

Turn on daily backups at the provider.

## 3. Environment variables

Set these in the host's secret settings (never commit them):

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `https://your-domain` (no trailing slash). **Must be set before `npm run build`** |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | `971525294086` |
| `NEXT_PUBLIC_INSTAGRAM_HANDLE` | `book_binding_uae` |
| `DATABASE_URL` | from step 2 |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` |
| `STORAGE_DRIVER` / `STORAGE_LOCAL_DIR` | `local` / a path on the persistent disk, outside the app folder, e.g. `/var/lib/bookbinding/private` |
| `UPLOAD_MAX_MB` | `50` |
| `TRUST_PROXY` | `1` when behind nginx/Caddy/Cloudflare/a platform proxy that sets `X-Forwarded-For` |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | from step 5 (leave empty to keep online payment off) |

## 4. Build and start

```bash
npm ci
npm run build
npm start            # listens on PORT (default 3000)
```

Put it behind HTTPS (Caddy does this automatically). Allow request bodies up to `UPLOAD_MAX_MB` + 1 MB in the proxy (nginx: `client_max_body_size 51m;`).

Schedule daily: `npm run uploads:cleanup`.

## 5. Stripe (card, Apple Pay, Google Pay)

1. Create a Stripe account for the business (Settings → Business details → UAE, currency AED).
2. Developers → API keys → copy the **secret key** → `STRIPE_SECRET_KEY`.
3. Developers → Webhooks → Add endpoint `https://your-domain/api/payments/stripe/webhook` with events
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`. Copy the **signing secret** → `STRIPE_WEBHOOK_SECRET`.
4. Settings → Payment methods: turn on Cards, Apple Pay, Google Pay.
5. Test with test keys first: place an order, confirm it in admin and set the delivery fee, pay with card `4242 4242 4242 4242`, and check the order shows **Paid**.

## 6. First staff account

Sign up on the live site with the owner's email, then on the server:

```bash
npm run user:role -- owner@example.com admin
```

## 7. After launch

- Submit `https://your-domain/sitemap.xml` in Google Search Console.
- Keep dependencies updated monthly (`npm outdated`, `npm audit --omit=dev`).
