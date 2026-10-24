"use client";

import { useLocale, useTranslations } from "next-intl";
import { Loader2, ShieldCheck, ShoppingBag, Trash2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cart, useCart } from "@/lib/cart/store";
import { PRODUCTS } from "@/lib/pricing/catalog";
import { formatAED } from "@/lib/pricing/money";
import { buttonClasses } from "@/components/ui/button";
import { Stepper } from "@/components/ui/form-controls";
import { ItemSummary } from "./item-summary";
import { useCartPrices } from "./use-cart-prices";

export function CartView({ signedIn }: { signedIn: boolean }) {
  const t = useTranslations();
  const locale = useLocale();
  const items = useCart();
  const prices = useCartPrices(items);

  if (!items.length) {
    return (
      <div className="rounded-2xl bg-navy-50/60 p-8 text-center">
        <ShoppingBag className="mx-auto size-10 text-navy-300" aria-hidden="true" />
        <p className="mt-3 text-ink-muted">{t("cart.empty")}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link href="/#products" className={buttonClasses("secondary", "md")}>
            {t("cart.browse")}
          </Link>
          <Link href="/thesis-builder" className={buttonClasses("primary", "md")}>
            {t("cart.openBuilder")}
          </Link>
        </div>
      </div>
    );
  }

  const allOk = prices.status === "ok" && prices.subtotal !== null;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <ul className="min-w-0 divide-y divide-line rounded-2xl ring-1 ring-line">
        {items.map((item, i) => {
          const product = PRODUCTS[item.request.productId];
          const line = prices.status === "ok" ? prices.lines[i] : null;
          return (
            <li key={item.id} className="p-4 sm:p-5">
              <div className="flex gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-navy-950">{t(`products.${product.id}.name`)}</p>
                  <div className="mt-1">
                    <ItemSummary request={item.request} design={item.design} file={item.upload} />
                  </div>
                </div>
                <div className="shrink-0 text-end">
                  {line?.ok ? (
                    <p className="ltr-value font-medium tabular-nums text-navy-950">{formatAED(line.quote.subtotal, locale)}</p>
                  ) : prices.status === "loading" ? (
                    <Loader2 className="ms-auto size-4 animate-spin text-ink-subtle" aria-label={t("cart.checking")} />
                  ) : null}
                </div>
              </div>
              {line && !line.ok && (
                <p role="alert" className="mt-2 text-sm text-danger">
                  {t("cart.lineError")}
                </p>
              )}
              <div className="mt-3 flex items-center justify-between gap-3">
                <Stepper
                  id={`qty-${item.id}`}
                  ariaLabel={t("cart.quantity")}
                  value={item.request.quantity}
                  min={product.minQty}
                  max={500}
                  onChange={(v) => cart.setQuantity(item.id, v)}
                  decLabel={t("order.decrease")}
                  incLabel={t("order.increase")}
                />
                <button
                  type="button"
                  onClick={() => cart.remove(item.id)}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-ink-muted hover:bg-navy-50 hover:text-danger"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                  {t("cart.remove")}
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-2xl p-5 ring-1 ring-line sm:p-6">
          <div className="flex items-baseline justify-between">
            <p className="font-semibold text-navy-950">{t("cart.subtotal")}</p>
            <p className="ltr-value text-xl font-semibold tabular-nums text-navy-950" aria-live="polite">
              {allOk ? formatAED(prices.subtotal!, locale) : "—"}
            </p>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-subtle">
            {prices.status === "ok" ? (
              <>
                <ShieldCheck className="size-4 text-success" aria-hidden="true" />
                {t("cart.checked")}
              </>
            ) : prices.status === "loading" ? (
              t("cart.checking")
            ) : null}
          </p>
          <p className="mt-4 text-sm text-ink-muted">{t("cart.deliveryNote")}</p>
          <Link
            href={signedIn ? "/checkout" : "/account/sign-in?next=/checkout"}
            aria-disabled={!allOk}
            className={buttonClasses("primary", "lg", `mt-5 w-full ${allOk ? "" : "pointer-events-none opacity-50"}`)}
          >
            {signedIn ? t("cart.checkout") : t("cart.signInToCheckout")}
          </Link>
        </div>
      </aside>
    </div>
  );
}
