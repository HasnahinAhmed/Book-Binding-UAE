# Book Binding UAE — website

Bilingual (English / Arabic) website for Book Binding UAE: thesis printing, hardcover binding and premium PU leather books. Customers can design a cover in 3D, see an exact price from the catalogue, upload their thesis PDF, place an order and pay online. Staff manage orders in a private admin area.

## What's inside

| Area | Where |
| --- | --- |
| Pages (EN `/en`, AR `/ar`, right-to-left) | `src/app/[locale]/` |
| 3D thesis builder (Three.js) | `src/lib/book/`, `src/components/configurator/` |
| Catalogue prices (single source of truth) | `src/lib/pricing/catalog.ts`, rules in `docs/PRICING_RULES.md` |
| Server pricing, uploads, orders, payments APIs | `src/app/api/` |
| Database schema and migrations (PostgreSQL + Drizzle) | `src/db/schema.ts`, `drizzle/` |
| Sign-in (Better Auth, email + password) | `src/lib/auth.ts` |
| Admin (staff only) | `src/app/[locale]/admin/`, `src/lib/admin/` |
| Translations | `messages/en.json`, `messages/ar.json` |

Stack: Next.js 16, React 19, TypeScript (strict), Tailwind CSS 4, next-intl, Drizzle ORM, Better Auth, Stripe, pdf-lib, Three.js, GSAP, Vitest, Playwright.

## Run it locally

Requirements: Node 22+, PostgreSQL 14+.

```bash
npm ci
cp .env.example .env.local          # then fill in DATABASE_URL and BETTER_AUTH_SECRET
npm run db:migrate                  # creates the tables
npm run dev                         # http://localhost:3000/en
```

Make yourself staff after signing up on the site:

```bash
npm run user:role -- you@example.com admin
```

Online card payments stay off until `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are set; customers are told payment details will follow on WhatsApp.

## Checks

```bash
npm run typecheck
npm run lint
npm test                  # unit tests (database tests are skipped)
npm run test:db           # + database tests; needs TEST_DATABASE_URL in .env.test.local (a throwaway database — it is wiped)
npm run build && npm start
E2E_BASE_URL=http://localhost:3000 E2E_DATABASE_URL=... npm run test:e2e
```

## Other scripts

| Script | What it does |
| --- | --- |
| `npm run images` | Rebuilds optimised WebP images from the original photos |
| `npm run db:generate` | Creates a migration after editing `src/db/schema.ts` |
| `npm run uploads:cleanup` | Deletes uploaded PDFs never attached to an order (older than 7 days). Run daily |

## Docs

- `docs/DEPLOYMENT.md` — going live, step by step
- `docs/SECURITY.md` — how customer data, files, payments and accounts are protected
- `docs/IMPLEMENTATION_PLAN.md` — milestones, what's done, open owner decisions
- `docs/PRICING_RULES.md` — catalogue prices and open pricing questions
- `docs/PROJECT_AUDIT.md`, `docs/ASSET_INVENTORY.md` — initial audit
