import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Preview build for GitHub Pages: static files only, no server.
// The full site (with accounts, orders, payments) uses the config on `main`.
const basePath = "/Book-Binding-UAE";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  reactStrictMode: true,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  images: { loader: "custom", loaderFile: "./image-loader.ts" },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");
export default withNextIntl(nextConfig);
