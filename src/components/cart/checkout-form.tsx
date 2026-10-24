"use client";

import { useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Info, Loader2 } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { cart, useCart } from "@/lib/cart/store";
import { EMIRATES, normalisePhone } from "@/lib/orders/checkout-schema";
import { PRODUCTS } from "@/lib/pricing/catalog";
import { formatAED } from "@/lib/pricing/money";
import { cn } from "@/lib/cn";
import { Button, buttonClasses } from "@/components/ui/button";
import { Segmented } from "@/components/ui/form-controls";
import { inputClasses, TextField } from "@/components/ui/text-field";
import { useCartPrices } from "./use-cart-prices";

type FieldErrors = Partial<Record<"name" | "phone" | "emirate" | "address", string>>;

export function CheckoutForm({ defaultName, email }: { defaultName: string; email: string }) {
  const t = useTranslations();
  const locale = useLocale() as "en" | "ar";
  const router = useRouter();
  const items = useCart();
  const prices = useCartPrices(items);
  const emirateId = useId();
  const [requestId] = useState(() => crypto.randomUUID());
  const [fulfilment, setFulfilment] = useState<"delivery" | "collection">("delivery");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!items.length) {
    return (
      <div className="rounded-2xl bg-navy-50/60 p-8 text-center text-ink-muted">
        <p>{t("checkout.empty")}</p>
        <Link href="/thesis-builder" className={buttonClasses("primary", "md", "mt-4")}>
          {t("cart.openBuilder")}
        </Link>
      </div>
    );
  }

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get("name") ?? "").trim();
    const phone = String(f.get("phone") ?? "");
    const emirate = String(f.get("emirate") ?? "");
    const address = String(f.get("address") ?? "").trim();
    const note = String(f.get("note") ?? "").trim();

    const errs: FieldErrors = {};
    if (name.length < 2) errs.name = t("checkout.errors.required");
    if (!normalisePhone(phone)) errs.phone = t("checkout.errors.invalid_phone");
    if (fulfilment === "delivery") {
      if (!emirate) errs.emirate = t("checkout.errors.required");
      if (address.length < 8) errs.address = t("checkout.errors.required");
    }
    setErrors(errs);
    if (Object.keys(errs).length) {
      e.currentTarget.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
      return;
    }

    setBusy(true);
    setFormError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          requestId,
          locale,
          items: items.map((i) => ({ request: i.request, design: i.design })),
          contact: { name, phone },
          fulfilment,
          ...(fulfilment === "delivery" ? { emirate, address } : {}),
          ...(note ? { note } : {}),
        }),
      });
      const json = (await res.json()) as { ok: boolean; order?: { number: string }; error?: { code?: string } };
      if (json.ok && json.order) {
        cart.clear();
        router.replace(`/account/orders/${json.order.number}?placed=1`);
        return;
      }
      const code = res.status === 401 ? "unauthorized" : res.status === 429 ? "rate_limited" : (json.error?.code ?? "generic");
      setFormError(["item_invalid", "upload_in_use", "price_unconfirmed", "unauthorized", "rate_limited"].includes(code) ? code : "generic");
    } catch {
      setFormError("generic");
    }
    setBusy(false);
  };

  const subtotal = prices.status === "ok" ? prices.subtotal : null;

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-8">
        <section aria-labelledby="contact-h" className="space-y-4">
          <h2 id="contact-h" className="text-lg font-semibold text-navy-950">
            {t("checkout.contact")}
          </h2>
          <TextField label={t("checkout.name")} name="name" autoComplete="name" defaultValue={defaultName} required maxLength={100} error={errors.name} />
          <TextField
            label={t("checkout.phone")}
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="05X XXX XXXX"
            dir="ltr"
            required
            maxLength={30}
            help={t("checkout.phoneHelp")}
            error={errors.phone}
          />
          <div>
            <p className="text-sm font-medium text-navy-950">{t("checkout.email")}</p>
            <p className="mt-1 text-ink-muted" dir="ltr">
              {email}
            </p>
          </div>
        </section>

        <section aria-labelledby="fulfil-h" className="space-y-4">
          <h2 id="fulfil-h" className="text-lg font-semibold text-navy-950">
            {t("checkout.fulfilment")}
          </h2>
          <Segmented
            name="fulfilment"
            value={fulfilment}
            onChange={setFulfilment}
            options={[
              { value: "delivery", label: t("checkout.delivery") },
              { value: "collection", label: t("checkout.collection") },
            ]}
          />
          {fulfilment === "delivery" ? (
            <>
              <p className="text-sm text-ink-subtle">{t("checkout.deliveryHelp")}</p>
              <div>
                <label htmlFor={emirateId} className="block text-sm font-medium text-navy-950">
                  {t("checkout.emirate")}
                </label>
                <select
                  id={emirateId}
                  name="emirate"
                  defaultValue=""
                  required
                  aria-invalid={errors.emirate ? true : undefined}
                  aria-describedby={errors.emirate ? `${emirateId}-err` : undefined}
                  className={cn(inputClasses, "mt-1.5 appearance-auto")}
                >
                  <option value="" disabled>
                    {t("checkout.chooseEmirate")}
                  </option>
                  {EMIRATES.map((e) => (
                    <option key={e} value={e}>
                      {t(`emirates.${e}`)}
                    </option>
                  ))}
                </select>
                {errors.emirate && (
                  <p id={`${emirateId}-err`} className="mt-1.5 text-sm text-danger">
                    {errors.emirate}
                  </p>
                )}
              </div>
              <TextField
                label={t("checkout.address")}
                name="address"
                autoComplete="street-address"
                multiline
                rows={3}
                maxLength={500}
                help={t("checkout.addressHelp")}
                error={errors.address}
              />
            </>
          ) : (
            <p className="text-sm text-ink-subtle">{t("checkout.collectionHelp")}</p>
          )}
          <TextField label={t("checkout.note")} name="note" multiline rows={3} maxLength={1000} />
        </section>
      </div>

      <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-2xl p-5 ring-1 ring-line sm:p-6">
          <h2 className="font-semibold text-navy-950">{t("checkout.summary")}</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {items.map((item, i) => {
              const line = prices.status === "ok" ? prices.lines[i] : null;
              return (
                <li key={item.id} className="flex justify-between gap-3">
                  <span className="text-ink-muted">
                    {t(`products.${PRODUCTS[item.request.productId].id}.name`)} × {item.request.quantity}
                  </span>
                  <span className="ltr-value tabular-nums text-navy-950">{line?.ok ? formatAED(line.quote.subtotal, locale) : "—"}</span>
                </li>
              );
            })}
            <li className="flex justify-between gap-3">
              <span className="text-ink-muted">{t("checkout.deliveryFee")}</span>
              <span className="text-navy-950">{fulfilment === "delivery" ? t("checkout.tbc") : "—"}</span>
            </li>
          </ul>
          <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
            <p className="font-semibold text-navy-950">{t("checkout.total")}</p>
            <p className="ltr-value text-xl font-semibold tabular-nums text-navy-950">{subtotal !== null ? formatAED(subtotal, locale) : "—"}</p>
          </div>
          <p className="mt-4 flex gap-2 rounded-xl bg-brand-50 p-3 text-sm text-navy-900">
            <Info className="mt-0.5 size-4 shrink-0 text-brand-700" aria-hidden="true" />
            {t("checkout.noPayment")}
          </p>
          {formError && (
            <p role="alert" className="mt-4 rounded-xl bg-danger-bg px-4 py-3 text-sm text-danger">
              {t(`checkout.errors.${formError}`)}
            </p>
          )}
          <Button type="submit" size="lg" className="mt-5 w-full" disabled={busy || subtotal === null}>
            {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {busy ? t("checkout.placing") : t("checkout.place")}
          </Button>
        </div>
      </aside>
    </form>
  );
}
