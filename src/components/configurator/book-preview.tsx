"use client";

import dynamic from "next/dynamic";
import { useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Maximize2, Minimize2, Move3d } from "lucide-react";
import type { ViewName } from "@/lib/book/book-studio";
import type { BookConfig } from "@/lib/book/config";
import { cn } from "@/lib/cn";

const BookCanvas = dynamic(() => import("./book-canvas"), { ssr: false });

const VIEWS: ViewName[] = ["hero", "front", "spine", "back"];

function webglSupported(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}
const noop = () => () => {};

export function BookPreview({
  cfg,
  fallback,
  compact,
  onToggleCompact,
}: {
  cfg: BookConfig;
  fallback: React.ReactNode;
  compact: boolean;
  onToggleCompact: () => void;
}) {
  const t = useTranslations("builder");
  // null on the server, then the real answer on the client
  const supported = useSyncExternalStore(noop, webglSupported, () => null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [view, setView] = useState<{ name: ViewName; seq: number }>({ name: "hero", seq: 0 });

  const unavailable = supported === false || failed;

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl bg-[radial-gradient(90%_70%_at_50%_35%,#ffffff_0%,var(--color-navy-50)_60%,var(--color-navy-100)_100%)]">
      <h2 className="sr-only">{t("previewLabel")}</h2>
      {unavailable ? (
        <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
          {fallback}
          <p className="font-semibold text-navy-950">{t("fallbackTitle")}</p>
          <p className="max-w-sm text-sm text-ink-muted">{t("fallbackBody")}</p>
        </div>
      ) : (
        <>
          {supported && (
            <div role="img" aria-label={t("previewLabel")} className="absolute inset-0">
              <BookCanvas cfg={cfg} view={view} onReady={() => setReady(true)} onError={() => setFailed(true)} />
            </div>
          )}
          {!ready && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-ink-muted" role="status">
              <Loader2 className="size-6 animate-spin text-brand-600" aria-hidden="true" />
              {t("loading")}
            </div>
          )}
        </>
      )}

      {!unavailable && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-2.5 sm:p-3">
          <div role="group" aria-label={t("viewsLabel")} className="pointer-events-auto flex gap-1 rounded-full bg-white/85 p-1 shadow-sm ring-1 ring-line backdrop-blur">
            {VIEWS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView((p) => ({ name: v, seq: p.seq + 1 }))}
                aria-pressed={view.name === v && view.seq > 0}
                className={cn(
                  "h-8 rounded-full px-3 text-xs font-medium text-ink-muted transition-colors hover:text-navy-950 sm:text-sm",
                  view.name === v && view.seq > 0 && "bg-navy-900 text-white hover:text-white",
                )}
              >
                {t(`views.${v}`)}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onToggleCompact}
            aria-label={compact ? t("expand") : t("collapse")}
            className="pointer-events-auto flex size-10 items-center justify-center rounded-full bg-white/85 text-navy-900 shadow-sm ring-1 ring-line backdrop-blur lg:hidden"
          >
            {compact ? <Maximize2 className="size-4" aria-hidden="true" /> : <Minimize2 className="size-4" aria-hidden="true" />}
          </button>
        </div>
      )}
      {ready && (
        <p className="pointer-events-none absolute top-3 start-3 hidden items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-xs text-ink-muted backdrop-blur sm:flex">
          <Move3d className="size-3.5" aria-hidden="true" />
          {t("dragHint")}
        </p>
      )}
    </div>
  );
}
