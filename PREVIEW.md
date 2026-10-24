# Preview build (GitHub Pages)

This branch is a **static preview** of the site for review before launch. It is not the production app.

- Pages, product photos, English/Arabic, the 3D builder, PDF page counting and the cart all work in the browser.
- Prices use the same pricing code as the real server (`src/lib/quote/server-quote.ts`), run in the browser.
- PDFs never leave the visitor's device here.
- Accounts, checkout, orders, payments and admin need the server and database; in this preview those pages show screenshots.

Build: `NEXT_PUBLIC_SITE_URL=https://hasnahinahmed.github.io npx next build`, then publish `out/` (plus `index.html` redirect and `.nojekyll`) to the `gh-pages` branch.

The production app lives on `main`.
