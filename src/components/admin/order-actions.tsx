"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { AdminAction, OrderStatus } from "@/lib/admin/orders";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { inputClasses } from "@/components/ui/text-field";

type PaymentStatus = "unpaid" | "pending" | "paid" | "refunded" | "failed";

export function OrderActions({
  orderId,
  status,
  nextStatuses,
  deliveryFee,
  paymentStatus,
}: {
  orderId: string;
  status: OrderStatus;
  nextStatuses: OrderStatus[];
  deliveryFee: number | null;
  paymentStatus: PaymentStatus;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ key: string; ok: boolean; text: string } | null>(null);

  const send = async (key: string, action: AdminAction, form?: HTMLFormElement) => {
    setBusy(key);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(action),
      });
      const json = (await res.json()) as { ok: boolean; error?: { code?: string } };
      if (json.ok) {
        setMsg({ key, ok: true, text: t("admin.order.saved") });
        form?.reset();
        router.refresh();
      } else {
        const code = json.error?.code ?? "generic";
        setMsg({ key, ok: false, text: t(`admin.order.errors.${["invalid_transition", "final_state", "invalid_input"].includes(code) ? code : "generic"}`) });
      }
    } catch {
      setMsg({ key, ok: false, text: t("admin.order.errors.generic") });
    }
    setBusy(null);
  };

  const feedback = (key: string) =>
    msg?.key === key && (
      <p role="status" className={cn("text-sm", msg.ok ? "text-success" : "text-danger")}>
        {msg.text}
      </p>
    );

  const box = "space-y-3 rounded-2xl p-5 ring-1 ring-line";
  const label = "block text-sm font-medium text-navy-950";

  return (
    <div className="space-y-4">
      <form
        className={box}
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          void send("status", { action: "status", status: String(f.get("status")) as OrderStatus, note: String(f.get("note") ?? "") || undefined }, e.currentTarget);
        }}
      >
        <h3 className="font-semibold text-navy-950">{t("admin.order.update")}</h3>
        {nextStatuses.length === 0 ? (
          <p className="text-sm text-ink-muted">{t("admin.order.final", { status: t(`orderStatus.${status}`) })}</p>
        ) : (
          <>
            <label className={label}>
              {t("admin.order.moveTo")}
              <select name="status" className={cn(inputClasses, "mt-1.5 h-11")} defaultValue={nextStatuses[0]}>
                {nextStatuses.map((s) => (
                  <option key={s} value={s}>
                    {t(`orderStatus.${s}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className={label}>
              {t("admin.order.statusNote")}
              <input name="note" maxLength={500} className={cn(inputClasses, "mt-1.5 h-11")} dir="auto" />
            </label>
            <Button type="submit" disabled={busy !== null}>
              {t("admin.order.update")}
            </Button>
          </>
        )}
        {feedback("status")}
      </form>

      <form
        className={box}
        onSubmit={(e) => {
          e.preventDefault();
          const v = Number(new FormData(e.currentTarget).get("fee"));
          void send("fee", { action: "delivery_fee", fee: Math.round(v * 100) });
        }}
      >
        <label className={label}>
          {t("admin.order.deliveryFee")}
          <input
            name="fee"
            type="number"
            min={0}
            max={100000}
            step="0.01"
            required
            defaultValue={deliveryFee === null ? "" : (deliveryFee / 100).toFixed(2)}
            className={cn(inputClasses, "ltr-value mt-1.5 h-11 w-40")}
          />
        </label>
        <p className="text-sm text-ink-subtle">{t("admin.order.deliveryHelp")}</p>
        <Button type="submit" variant="secondary" disabled={busy !== null}>
          {t("admin.order.saveFee")}
        </Button>
        {feedback("fee")}
      </form>

      <form
        className={box}
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          void send("payment", { action: "payment", status: String(f.get("pstatus")) as "paid", note: String(f.get("pnote") ?? "") }, e.currentTarget);
        }}
      >
        <h3 className="font-semibold text-navy-950">{t("admin.order.paymentTitle")}</h3>
        <p className="text-sm text-ink-subtle">{t("admin.order.paymentHelp")}</p>
        <label className={label}>
          {t("admin.order.paymentStatus")}
          <select name="pstatus" defaultValue={paymentStatus === "paid" ? "refunded" : "paid"} className={cn(inputClasses, "mt-1.5 h-11")}>
            {(["paid", "unpaid", "refunded"] as const).map((s) => (
              <option key={s} value={s}>
                {t(`paymentStatus.${s}`)}
              </option>
            ))}
          </select>
        </label>
        <label className={label}>
          {t("admin.order.paymentNote")}
          <input name="pnote" required minLength={2} maxLength={500} className={cn(inputClasses, "mt-1.5 h-11")} dir="auto" />
        </label>
        <Button type="submit" variant="secondary" disabled={busy !== null}>
          {t("admin.order.savePayment")}
        </Button>
        {feedback("payment")}
      </form>

      <form
        className={box}
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          void send("note", { action: "note", note: String(f.get("note") ?? ""), public: f.get("public") === "on" }, e.currentTarget);
        }}
      >
        <h3 className="font-semibold text-navy-950">{t("admin.order.noteTitle")}</h3>
        <textarea name="note" required maxLength={1000} rows={3} className={cn(inputClasses, "h-auto py-3")} dir="auto" aria-label={t("admin.order.noteTitle")} />
        <label className="flex items-center gap-2 text-sm text-navy-950">
          <input type="checkbox" name="public" className="size-4 accent-brand-600" />
          {t("admin.order.notePublic")}
        </label>
        <Button type="submit" variant="secondary" disabled={busy !== null}>
          {t("admin.order.saveNote")}
        </Button>
        {feedback("note")}
      </form>
    </div>
  );
}
