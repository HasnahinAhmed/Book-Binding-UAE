import path from "node:path";
import { expect, test } from "@playwright/test";

const pdf = path.join(import.meta.dirname, "fixtures/thesis-12-pages.pdf");

test("customer builds a book, uploads a PDF, signs up and places an order", async ({ page }) => {
  // builder: preselect product, go to pages step, upload
  await page.goto("/en/thesis-builder?product=regular-hardcover");
  await page.getByRole("button", { name: /Pages & quantity/ }).click();
  await page.locator('input[type=file][accept*="pdf"]').setInputFiles(pdf);
  await expect(page.getByText("12 pages counted from your PDF")).toBeVisible();

  await page.getByRole("button", { name: /Review/ }).click();
  await expect(page.getByText("Price checked on our server")).toBeVisible();
  await page.getByRole("button", { name: "Add to cart" }).evaluate((b: HTMLButtonElement) => b.click());
  await expect(page.getByText("Added to your cart.")).toBeVisible();

  // cart → sign up → checkout
  await page.goto("/en/cart");
  // AED 120 cover + 12 × AED 0.20 = AED 122.40
  await expect(page.getByText("AED 122.40").first()).toBeVisible();
  await page.getByRole("link", { name: "Sign in to check out" }).click();
  await page.getByRole("link", { name: "Create an account" }).click();
  await page.getByLabel("Full name").fill("E2E Customer");
  await page.getByLabel("Email").fill(`e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`);
  await page.getByLabel("Password").fill("e2e-password-123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/en\/checkout$/);

  await page.getByRole("button", { name: "Place order request" }).click();
  await expect(page.getByText("Please enter a valid mobile number.")).toBeVisible();
  await page.getByLabel("Mobile number (WhatsApp)").fill("050 123 4567");
  await page.getByRole("radio", { name: "Collection" }).check({ force: true });
  await page.getByRole("button", { name: "Place order request" }).click();

  await expect(page).toHaveURL(/\/en\/account\/orders\/BBU-\d{6}\?placed=1$/);
  await expect(page.getByText(/We have received order request/)).toBeVisible();
  await expect(page.getByText("thesis-12-pages.pdf").first()).toBeVisible();
  await expect(page.getByText("Not paid yet")).toBeVisible();
});

test("Arabic pages are right-to-left and translated", async ({ page }) => {
  await page.goto("/ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await page.goto("/ar/cart");
  await expect(page.getByRole("heading", { name: "سلة التسوق" })).toBeVisible();
});

test("private areas are protected", async ({ page, request }) => {
  await page.goto("/en/account");
  await expect(page).toHaveURL(/\/en\/account\/sign-in\?next=%2Faccount|\/en\/account\/sign-in\?next=\/account/);
  await page.goto("/en/admin");
  await expect(page).toHaveURL(/sign-in/);

  expect((await request.post("/api/orders", { data: {} })).status()).toBe(401);
  expect((await request.get("/api/admin/files/AAAAAAAAAAAAAAAAAAAAAA")).status()).toBe(404);
  const cross = await request.post("/api/quote", { data: {}, headers: { origin: "https://evil.example" } });
  expect(cross.status()).toBe(403);
});

test("security headers are set", async ({ request }) => {
  const res = await request.get("/en");
  const h = res.headers();
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["strict-transport-security"]).toContain("max-age=");
});
