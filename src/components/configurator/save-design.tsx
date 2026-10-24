"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Bookmark, Loader2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { SavedState } from "@/lib/configurator/state";

export function SaveDesign({ state, name }: { state: SavedState; name: string }) {
  const t = useTranslations("builder.save");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "signin" | "error">("idle");

  const save = async () => {
    setStatus("saving");
    try {
      const res = await fetch("/api/designs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.slice(0, 80), state }),
      });
      setStatus(res.status === 201 ? "saved" : res.status === 401 ? "signin" : "error");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={save}
        disabled={status === "saving"}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-navy-950 disabled:opacity-60"
      >
        {status === "saving" ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Bookmark className="size-4" aria-hidden="true" />}
        {status === "saving" ? t("saving") : t("save")}
      </button>
      <p aria-live="polite" className="text-sm">
        {status === "saved" && <span className="text-success">{t("saved")}</span>}
        {status === "error" && <span className="text-danger">{t("error")}</span>}
        {status === "signin" && (
          <Link href="/account/sign-in?next=/thesis-builder" className="font-medium text-brand-700 underline underline-offset-4">
            {t("signIn")}
          </Link>
        )}
      </p>
    </div>
  );
}
