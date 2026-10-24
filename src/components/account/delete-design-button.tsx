"use client";

import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";

export function DeleteDesignButton({ id, name }: { id: string; name: string }) {
  const t = useTranslations("account");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      aria-label={`${t("delete")}: ${name}`}
      onClick={async () => {
        setBusy(true);
        await fetch(`/api/designs/${id}`, { method: "DELETE" }).catch(() => null);
        router.refresh();
      }}
      className="inline-flex size-9 items-center justify-center rounded-full text-ink-muted hover:bg-navy-50 hover:text-danger disabled:opacity-50"
    >
      <Trash2 className="size-4" aria-hidden="true" />
    </button>
  );
}
