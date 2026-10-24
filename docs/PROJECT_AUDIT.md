# Project Audit — Book Binding UAE website

_Audit date: 2026-10-24. Status labels used below: **Confirmed**, **Proposed**, **Assumption**, **Open question**._

## 1. What was inspected

| Source | Where it came from | Inspected |
|---|---|---|
| `BOOK_BINDING_UAE_CLAUDE_CODE_MASTER_GUIDE.md` | Project files | Fully read |
| `BOOK_BINDING_UAE_CLAUDE_CODE_MASTER_START_PROMPT.md` | Upload | Fully read |
| `BB_WEBSITE_CODE_PROJECT_INSTRUCTIONS_CONTEXT.md` | Project files | Fully read |
| `book-binding Demo 1.zip` | Upload (same file also in `D:\Claude\Book Binding UAE\Website\Refarence`) | Structure, package, worklog, pricing, auth, payment, storage, 3D engine, university data |
| `book-binding Demo 2.zip` | Upload (same file also on device) | Structure, docs (SETUP/API), product + pricing data, schema, designer |
| `Book Binding UAE Catalog.pdf` | Upload (same file on device) | 1 page, text + all 16 embedded images + 2 links |
| `D:\Claude\Book Binding UAE\Book pictures\**` | User's PC (folder access granted) | 19 PNGs, all viewed |
| `D:\Claude\Book Binding UAE\Website\Logos Veriation\*` | User's PC | 4 logo PNGs, all viewed |
| `UAE All Universities - Final Master List.pdf` | User's PC | Text extracted (directory of institutions) |
| `UAE_University_Thesis_Requirements_Project_Context.md` | User's PC | Read (research brief, not data) |

**Not available / not inspected**
- **Figma:** no Figma file URL was provided, so no Figma design was inspected. (A Figma connector exists in this environment; it needs a file link.)
- **Clevaro reference** (`https://clevaro.framer.website/`): not yet visited. Will be used for inspiration only.
- **Google Drive folder** linked from the catalogue ("Click here to watch video"): not accessible from here.
- **`BOOK_BINDING_UAE_PROJECT_CONTEXT.md`**: not found anywhere in the provided material.
- **Repository:** there is no existing repository. No GitHub account is linked to this session yet.
- Folders the start prompt mentions (`Journal`, `Stationery`, yearbook photos) were **not** in `D:\Claude\Book Binding UAE`. Only `Book pictures` and `Website` exist there.

## 2. Workspace and stack

- **Workspace:** no existing app. A new app is being created at `/home/claude/bbuae` (cloud container) and will be pushed to GitHub once a repo is available. Copies of docs are saved to the project's shared folder.
- **Demo 1:** Next.js 16 + React 19 + Tailwind 4 + shadcn/ui + Prisma (PostgreSQL) + Three.js 0.186. Package manager: bun.
- **Demo 2:** static HTML/CSS/vanilla JS (no build) + optional Supabase backend; hand-written WebGL book.

## 3. Demo 1 — factual feature inventory

**Useful and worth reusing**
- `src/lib/book/*` (~3,500 lines): a real Three.js book engine — rounded/square spine, page block, headbands, leather/cloth procedural textures, foil stamping on cover and spine, corner guards, stitching, gold border, logo upload, **RTL (Arabic) binding flip**, bilingual (Arabic + English) cover text, named camera views. This is the best asset in either demo and is the basis for our 3D configurator.
- Cover layout logic (logo top-centre or top-left corner; title, Arabic title, author, supervisor, year) modelled on real bound theses.
- Free-hand "white paper" cover editor with mm-exact blocks stamped onto the 3D cover.
- Server-side re-pricing on order creation; order snapshot idea; order status timeline; audit log idea; files stored outside the public web root.

**Problems found (do not carry over)**
- **Prices are invented**: base AED 120 incl. 100 pages, AED 0.12/extra page, leather +45, foil +25, ribbon, express 30%, quantity discounts, delivery fees per emirate, 25% advance. None of these appear in the catalogue.
- **University requirements are invented**: 23 universities with "mandatory" cover colours/materials/foil and no source or verification status. Must not be shown as official.
- **Simulated payment**: `/api/orders/[id]/pay` marks an advance as paid with no gateway (violates "no fake checkout").
- **Seeded default credentials** (`admin@bookbindinguae.ae / Admin@123`, `student@demo.ae / Demo@123`) documented in the worklog.
- **A real `.env` file is inside the zip** (contains a DATABASE_URL). It should be treated as exposed; rotate that database password if it is a real database.
- `typescript.ignoreBuildErrors: true` (65 known type errors hidden); `reactStrictMode: false`.
- Custom-built auth (scrypt + DB session cookies). It is reasonably written, but the guide prefers a maintained auth library; no rate limiting, no MFA, no CSRF checks beyond SameSite=Lax.
- Very large dependency set (50+ shadcn/radix packages, framer-motion, react-query, MDX editor, AI SDK) for what is needed.
- Colour theme is ivory/gold "quiet luxury", not the requested blue identity. No Arabic UI (only Arabic cover text).
- Many ad-hoc debug scripts and screenshots inside `scripts/`.

## 4. Demo 2 — factual feature inventory

**Useful and worth reusing**
- **Product data model with four products** (see PRICING_RULES.md): Regular Thesis Hardcover, Custom Design Book, PU Leather Luxury Book, Luxury Book + Luxury Box — with colours, finish type, MOQ, base and tier price.
- Interior printing rates that **match the catalogue** (80 GSM: colour 0.50 / B&W 0.20 per page; 120 GSM: colour 1.00 / B&W 0.50).
- Add-ons that **match the catalogue** (spine/sidebar printing +20 per book, metal corner gold/silver +5 per book).
- Spine thickness rule: `0.5 cm + pages / 60 cm`.
- Bilingual EN/AR UI with RTL and a translation dictionary approach; Noto Sans Arabic for Arabic.
- WhatsApp order message builder.
- Supabase schema with row-level security, roles (customer / staff / super_admin), orders, designs, universities with a `verified` flag on specs. Good role model to follow.
- Honest copy: "Prices are for hardcover binding only. Page printing is charged separately."

**Problems found**
- Demo mode stores accounts in the visitor's browser (not secure). Supabase backend never tested live (its own SETUP.md says so).
- Prices are computed only in the browser; "We confirm the final price on WhatsApp".
- No payments, no file upload, no PDF page counting.
- Hand-rolled WebGL book is simpler and less realistic than Demo 1's Three.js engine.
- 425 KB single line of embedded base64 images inside `index.html`.
- **WhatsApp number conflict** (see §6).

## 5. Business facts — confirmed vs. not

| Fact | Status | Source |
|---|---|---|
| Business name "Book Binding UAE", UAE-wide | Confirmed | All three instruction docs |
| 14+ years of industry experience (not business age) | Confirmed | Instruction docs |
| Instagram @book_binding_uae | Confirmed | Docs + catalogue link |
| WhatsApp +971 52 942 7423 | Confirmed by docs — **conflicts with Demo 2** | Docs |
| Brand logo "Book Binding UAE · تجليد وطباعة · Binding & Printing", brand blue ≈ `#0295D6` | Confirmed | Logo files |
| Operating company "Zahra Stationery LLC" | **Open question** (only in Demo 2; catalogue shows a "zahra" mark) | Demo 2, catalogue |
| Catalogue prices for PU Luxury Cover & Luxury Box | Confirmed (with ambiguities) | Catalogue |
| Prices for Regular / Custom / PU Leather book | **Open question** (Demo 2 only) | Demo 2 |
| Delivery fees, delivery areas, turnaround times | **Open question** — none found | — |
| VAT treatment (are prices VAT-inclusive?) | **Open question** | — |
| Payment provider | **Open question** | — |
| Accepted upload formats / max size | **Open question** (Demo 1 used PDF/PNG/JPG ≤10 MB, not confirmed) | — |
| University thesis requirements | **None verified.** Master list PDF is a directory (names, emirate, type, website, phone, social, "thesis binding relevance") with no binding rules | Master list PDF |

## 6. Conflicts found

1. **WhatsApp number**: docs say **+971 52 942 7423**; Demo 2 uses **+971 52 529 4086**. → Using the docs number (owner's latest instruction). Please confirm.
2. **Luxury Box minimum order**: catalogue shows "Single Book & Box 1000 AED" and also "Minimum Order Quantity: 2 Bundel". Demo 2 reads this as 1 bundle = 1 book + 1 box, minimum 2 bundles (AED 2,000). → Following Demo 2's reading until confirmed.
3. **"2 Book's & Box Price 2000 AED"**: unclear whether that is 2 books + 1 box or 2 books + 2 boxes.
4. **B&W 80 GSM "1 AED for 5 page"**: Demo 2 uses AED 0.20 per page. For counts that are not a multiple of 5 the rounding rule is unknown.
5. **Demo 1 vs Demo 2 vs catalogue prices**: Demo 1 prices conflict with both. Demo 1 is discarded as a price source.
6. **Theme**: Demo 1 ivory/gold, Demo 2 dark; requirement is premium blue. → Blue, from the logo.

## 7. Security observations

- Exposed `.env` inside Demo 1 zip (see §3). The new repo ignores `.env*` except `.env.example`.
- Default admin passwords in Demo 1 → the new app will create the first admin from a one-time CLI command with a password the owner chooses; no default credentials.
- Demo 1 payment is simulated → the new app never marks orders paid without a verified provider webhook.
- Demo 2 browser-only accounts → the new app keeps all auth, pricing, and permissions on the server.

## 8. Recommended first slice

Foundation (Milestone 1): new Next.js + TypeScript (strict) app, blue design tokens, Inter + Arabic font, EN/AR routing with RTL, header/footer/WhatsApp, security headers, env validation, pricing engine module with tests built from the confirmed catalogue values. See IMPLEMENTATION_PLAN.md.
