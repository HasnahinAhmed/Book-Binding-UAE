import { defineConfig, devices } from "@playwright/test";

// End-to-end tests run against a production build with a real database.
// Start the app first (npm run build && npm start), or set E2E_BASE_URL.
export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  timeout: 60_000,
  retries: 0,
  workers: 1,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    reducedMotion: "reduce",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], launchOptions: { args: ["--disable-webgl"] } } },
    { name: "mobile", use: { ...devices["Pixel 7"], launchOptions: { args: ["--disable-webgl"] } } },
  ],
});
