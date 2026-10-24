"use client";

import { useLocale } from "next-intl";
import { installDemoApi } from "./demo-api";

installDemoApi();

/** Small badge so nobody mistakes the preview for the live shop. */
export function DemoApiInstaller() {
  const ar = useLocale() === "ar";
  return (
    <div
      role="note"
      className="pointer-events-none fixed top-[calc(72px+env(safe-area-inset-top))] end-3 z-30 rounded-full bg-brand-700/90 px-2.5 py-1 text-[0.6875rem] font-semibold text-white shadow-lg"
    >
      {ar ? "معاينة · ليس المتجر الحقيقي" : "Preview · not the live shop"}
    </div>
  );
}
