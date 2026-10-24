# Pricing Rules

_Source of truth: `Book Binding UAE Catalog.pdf` (1 page, "PU LUXURY COVER & LUXURY BOX"). Currency: AED. Last reviewed: 2026-10-24._

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

## 2. Add-ons — CONFIRMED (catalogue)

| Add-on | Price |
|---|---|
| Spine / sidebar printing | +AED 20 per book |
| Metal corners (gold or silver) | +AED 5 per book |

The catalogue lists these on the PU Luxury page. Demo 2 offers them on all four products. **Open question P4:** are both add-ons available for every product?

## 3. Cover / binding products

| Product | Base price | Status | Source |
|---|---|---|---|
| **PU Luxury Cover & Luxury Box** (book + matching box) | AED 1,000 per bundle; "2 Book's & Box" AED 2,000; minimum order "2 Bundel" | **CONFIRMED with ambiguity** | Catalogue |
| University Regular Thesis Hardcover (screen print, gold/silver) | AED 120 for 1; AED 100 each from 2 copies | **UNCONFIRMED** | Demo 2 only |
| Custom Design Book (digital/screen print) | AED 120 for 1; AED 100 each from 2 copies | **UNCONFIRMED** | Demo 2 only |
| PU Leather Luxury Book (foil) | AED 300 each; minimum 3 (3 books AED 900) | **UNCONFIRMED** | Demo 2 only |

The owner's start prompt mentions "AED 100, AED 120, or AED 300" as catalogue examples, which matches Demo 2, but these values are not in the catalogue file we received. **Open question P5:** please confirm these three prices (or share the other catalogue pages).

Luxury Box open questions:
- **P6.** Does the AED 1,000 bundle = 1 book + 1 box? Is the minimum 2 bundles? Is "2 Book's & Box 2000" = 2 books + 2 boxes?

## 4. Colours and finishes (from catalogue + photos)

- PU Luxury book colours: **Acero** (black textured), **Madera** (brown), **Tejus** (gold/croc texture), "+ More" (on request).
- Box colours: Acero, Madera, Tejus, + More.
- Foil colours: **Gold**, **Silver**.
- Regular hardcover colours seen in photos and Demo 2: black, maroon, navy/royal blue. (Demo 2 data; photos confirm black, maroon, navy exist.)

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
- Products with **unconfirmed** prices are shown with an "estimate — to be confirmed" label and **cannot be paid online** until the owner confirms the price in admin.
