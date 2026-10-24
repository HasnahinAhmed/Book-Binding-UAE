"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PayButton({ number, amount }: { number: string; amount: string }) {
  const t = useTranslations("orderPage");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  return (
    <div className="space-y-2">
      <Button
        size="lg"
        className="w-full"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(false);
          try {
            const res = await fetch(`/api/orders/${number}/pay`, { method: "POST" });
            const json = (await res.json()) as { ok: boolean; url?: string };
            if (json.ok && json.url && json.url.startsWith("https://")) {
              window.location.assign(json.url);
              return;
            }
          } catch {
            /* handled below */
          }
          setError(true);
          setBusy(false);
        }}
      >
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <CreditCard className="size-4" aria-hidden="true" />}
        {t("pay", { amount })}
      </Button>
      <p className="text-center text-xs text-ink-subtle">{t("payMethods")}</p>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {t("payError")}
        </p>
      )}
    </div>
  );
}
