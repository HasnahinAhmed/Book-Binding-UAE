# Implementation Plan

_Living checklist. Update after every milestone. Last updated: 2026-10-24._

## Stack decision

There is no existing repository, and neither demo is a sound production base (Demo 1 hides 65 type errors, has a fake payment route and invented prices; Demo 2 is static with browser-only accounts). So: **a new app, porting only the verified pieces** (Demo 1's Three.js book engine, Demo 2's product/price data and EN/AR approach).

| Concern | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript strict | Same as Demo 1, server components keep secrets and pricing server-side |
| Styling | Tailwind CSS 4 with CSS-variable design tokens | Small, consistent, RTL-friendly logical properties |
| i18n | `next-intl` with `/en` and `/ar` routes, `dir="rtl"` for Arabic | Locale files, SEO-friendly URLs, switch keeps current page |
| Fonts | Inter (Latin) + IBM Plex Sans Arabic (Arabic), self-hosted via `next/font` | Inter has no Arabic glyphs |
| Database | PostgreSQL + Drizzle ORM | Typed SQL, no codegen step, small runtime |
| Auth | Better Auth (email + password, sessions, rate limiting, roles, 2FA for staff) | Maintained library instead of custom auth |
| Validation | Zod | All untrusted input |
| 3D | Three.js (ported from Demo 1), loaded only on the configurator page | Already proven; no extra 3D framework |
| Motion | GSAP + ScrollTrigger, used sparingly, reduced-motion aware | Requested |
| Icons | lucide-react | One consistent set |
| PDF page count | `pdf-lib` on the server | Pure JS, reads page count without rendering |
| File storage | Private storage behind a storage interface: local private dir in dev, S3-compatible bucket (e.g. Cloudflare R2 / AWS S3) in production with short-lived signed URLs | Files never public |
| Payments | Provider interface; adapter added once the owner chooses (Stripe, Network International N-Genius, Telr, Tap…) | Not confirmed |
| Tests | Vitest (unit/integration), Playwright (e2e) | |

## Milestones

Status: ☐ not started · ◐ in progress · ☑ done

1. ☑ **Foundation & security** — scaffold, strict TS, ESLint, env validation, security headers/CSP, design tokens, fonts, EN/AR routing + RTL, header/footer/mobile nav, WhatsApp button, pricing engine + unit tests from confirmed catalogue data, optimized real images.
2. ☑ **Design system & shared components** — buttons, inputs, selects, cards, badges, dialogs, toasts, price breakdown component, skeletons, focus states.
3. ☑ **Homepage & catalogue pages** — hero with real photos, four category cards (Regular hardcover, Custom design, PU leather, Luxury book + box — **pending owner approval**), product detail pages, How it works, FAQ (only verified answers), contact.
4. ☑ **Quick order** — per-category simple options, live breakdown (cover vs printing separated), add to cart.
5. ☑ **3D thesis configurator** — port Demo 1 engine; steps; English/Arabic cover preview toggle (LTR vs RTL binding + bilingual text); mobile sticky preview 40–50% height; WebGL fallback.
6. ☑ **Server pricing, secure PDF upload** — private storage, magic-byte + size checks, server page count, authoritative quote API.
   - `POST /api/quote`: strict schema (unknown keys such as a client total are rejected), page count taken from the uploaded file when an upload id is sent, 8 KB body cap, 120 req/min per visitor.
   - `POST /api/uploads`: same-origin only, multipart, streamed size cap (`UPLOAD_MAX_MB`, default 50), `%PDF-` byte check, pdf-lib parse, password-protected files refused, 1–2,000 pages, 10 uploads / 10 min per visitor. Stored owner-only (0600) outside `public/` under a random 128-bit id; file names are display-only.
   - `DELETE /api/uploads/:id`: lets the uploader remove the file.
   - Builder: PDF upload with progress, page count locked to the server's count, review step shows the server-checked price.
   - Follow-ups: link uploads to orders and delete unattached uploads after 7 days (M7); staff download via short-lived signed links (M9); S3/R2 driver for multi-server hosting; shared rate-limit store when running more than one instance.
7. ☐ **Accounts, cart, checkout, orders** — Better Auth, order history, order detail timeline, saved designs.
8. ☐ **Payments, delivery, WhatsApp** — provider adapter + verified webhook (blocked on provider choice/keys), delivery options (blocked on fees), WhatsApp order hand-off.
9. ☐ **Admin** — role-protected: orders/status, products & prices (confirm unconfirmed prices), universities (directory + requirement records with source/verified flag), content, audit log.
10. ☐ **Arabic completeness, SEO, a11y, performance** — full translation pass, metadata/sitemap/robots, Lighthouse.
11. ☐ **Tests, security review, production build, deployment docs.**

## Blockers / decisions needed from owner

| # | Question | Blocks |
|---|---|---|
| D1 | Approve the four homepage categories (Regular hardcover · Custom design · PU leather · Luxury book + box) | Milestone 3 final copy |
| ~~D2~~ | Resolved: full catalogue confirms all prices | — |
| D3 | Luxury Box bundle and minimum (PRICING_RULES P6) | Box pricing |
| ~~D4~~ | Resolved: +971 52 529 4086 | — |
| D5 | Payment provider + account | Milestone 8 |
| D6 | Delivery fees/areas, collection address, VAT | Milestone 8 |
| D7 | Upload formats and max size | Built with PDF only, 50 MB (configurable). Confirm or change |
| D8 | GitHub repository to push to | Saving work outside the session |
| D9 | Hosting (Vercel + managed Postgres + R2/S3 is the proposal) | Deployment |
