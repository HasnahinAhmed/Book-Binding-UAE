# Pricing Rules

_Source of truth: full `Book Binding UAE Catalog.pdf` (6 pages, Zahra Stationery LLC, dated 17 October 2026), received from the owner on 2026-10-24. Currency: AED._

> Catalogue footer, verbatim: **"Price is for hardcover binding only. Printing charges apply separately."**
> So every product price below is the **cover/binding** price. Interior page printing is always a separate line.

## 1. Interior page printing — CONFIRMED (catalogue)

| Paper | Colour | Black & White |
|---|---|---|
| 80 GSM | AED 0.50 per page | AED 1 per 5 pages (= AED 0.20 per page) |
| 120 GSM | AED 1.00 per page | AED 0.50 per page |

Formula (per copy): `pages × rate(paper, mode)`. Order printing total: `per-copy printing × copies`.

Open questions:
- **P1.** 80 GSM B&W is "1 AED for 5 pages". For 123 pages, is it AED 24.60 (0.20 × 123) or AED 25 (rounded up to the next 5 pages)? _Current implementation: 0.20 × pages, rounded to 2 decimals (same as Demo 2)._
- **P2.** Does "page" mean one printed side or one sheet? _Current assumption: one PDF page = one printed page._
- **P3.** Can one document mix colour and B&W pages (priced separately)? _Current: one mode per order item._

## 2. Add-ons — CONFIRMED (catalogue pages 2–5, listed on every product)

| Add-on | Price |
|---|---|
| Spine / sidebar printing | +AED 20 per book |
| Metal corners (gold or silver) | +AED 5 per book |

## 3. Cover / binding products — CONFIRMED (catalogue)

| Product (catalogue page) | Price | Minimum | Lettering |
|---|---|---|---|
| Thesis Cover (Regular) (p2) | AED 120 single book; AED 100 per book for multiple books | 1 | Gold / silver screen printing |
| Custom Design Cover (p3) | AED 120 single; AED 100 per book for multiple | 1 | Digital / screen print — gold, silver, + more; "depends on customization" |
| PU Leather Luxury Cover (p4) | AED 300 single; 3 books AED 900 | 3 books | Gold / silver foil |
| PU Luxury Cover & Luxury Box (p5) | AED 1,000 single book & box; 2 books & box AED 2,000 | "2 Bundel" | Gold / silver foil |

Regular and Custom pages say "Hardcover Price Only". Interpretation used: "multiple" = 2 or more copies at AED 100 each.

Remaining open questions:
- **P6.** Luxury box: catalogue lists a single-set price (AED 1,000) but a minimum of "2 Bundel". _Current: AED 1,000 per set, minimum 2 sets._ Please confirm a single set cannot be ordered.
- **P6b.** PU Leather: catalogue shows a single-book price (AED 300) but minimum 3 books. _Current: minimum 3._

## 4. Colours and finishes (from catalogue + photos)

- PU Luxury book colours: **Acero** (black textured), **Madera** (brown), **Tejus** (gold/croc texture), "+ More" (on request).
- Box colours: Acero, Madera, Tejus, + More.
- Foil colours: **Gold**, **Silver**.
- Regular and Custom cover colours: Black, Maroon, Royal Blue (Custom: + more on request).

## 5. Not confirmed — NOT implemented as prices

Delivery fees, express/turnaround surcharges, quantity discounts (other than the Demo 2 "2+ copies AED 100" tier), advance/deposit percentage, VAT, coupon codes. Demo 1's values for these are invented and are **not used**.

- **P7.** Delivery: fees per emirate? free threshold? collection address?
- **P8.** VAT: are the prices VAT-inclusive? Is the business VAT-registered (TRN)?
- **P9.** Is full payment required online, or a deposit?

## 6. How prices are applied in code

- All values live in one data module (`src/lib/pricing/catalog.ts`) and later in the database (admin-editable), each with a `status: "confirmed" | "unconfirmed"` and `source`.
- `calculateQuote()` is a pure function, unit-tested, used by both the browser (estimate) and the server (authoritative).
- The server always recalculates from IDs/options; it never accepts a client total.
- Page count for an uploaded PDF is read on the server.
- The breakdown always shows: cover/binding, interior printing, add-ons, quantity subtotal, delivery (when known), total.
- All four products are now confirmed. Any future product added with `status: "unconfirmed"` is shown as "Price to be confirmed" and cannot be paid online until confirmed in admin.
