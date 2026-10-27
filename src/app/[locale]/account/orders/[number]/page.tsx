import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, Check, CircleCheckBig, FileText } from "lucide-react";
import { db } from "@/db";
import { ItemSummary } from "@/components/cart/item-summary";
import { StatusBadge } from "@/components/account/status-badge";
import { WhatsAppIcon } from "@/components/icons/whatsapp";
import { buttonClasses } from "@/components/ui/button";
import { whatsappLink, formatPhone } from "@/config/site";
import { Link, redirect } from "@/i18n/navigation";
import { currentSession } from "@/lib/auth";
import type { Design } from "@/lib/cart/schema";
import { cn } from "@/lib/cn";
import { getOrderForUser } from "@/lib/orders/queries";
import { isPayable } from "@/lib/payments/stripe-flow";
import { serverEnv } from "@/lib/server/env";
import { PayButton } from "@/components/account/pay-button";
import { formatAED } from "@/lib/pricing/money";
import type { QuoteRequest } from "@/lib/quote/server-quote";

type Props = { params: Promise<{ locale: string; number: string }>; searchParams: Promise<{ placed?: string; paid?: string }> };

const FLOW = ["submitted", "confirmed", "in_production", "ready", "completed"] as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, number } = await params;
  const t = await getTranslations({ locale, namespace: "orderPage" });
  return { title: t("metaTitle", { number }), robots: { index: false } };
}

export default async function OrderPage({ params, searchParams }: Props) {
  const { locale, number } = await params;
  setRequestLocale(locale);
  const session = await currentSession();
  if (!session) return redirect({ href: `/account/sign-in?next=/account/orders/${number}`, locale });
  const data = await getOrderForUser(db, session.user.id, number);
  if (!data) notFound();
  const { order, items, events, files } = data;
  const sp = await searchParams;
  const placed = sp.placed === "1";
  const justPaid = sp.paid === "1" && order.paymentStatus !== "paid";
  const payable = isPayable(order).ok;
  const notes = events.filter((e) => e.note);

  const t = await getTranslations();
  const format = await getFormatter();
  const when = (d: Date) => format.dateTime(d, { dateStyle: "medium", timeStyle: "short" });
  const reached = new Map(events.filter((e) => e.status).map((e) => [e.status!, e.createdAt]));
  const currentIdx = FLOW.indexOf(order.status as (typeof FLOW)[number]);
  const wa = whatsappLink(t("orderPage.waText", { number: order.number }));
  const fileFor = (uploadId: string | null) => files.find((f) => f.uploadId === uploadId);

  return (
    <div className="container-page py-10 lg:py-14">
      <Link href="/account" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-navy-950">
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
        {t("orderPage.back")}
      </Link>

      {placed && (
        <div role="status" className="mt-6 rounded-2xl bg-success-bg p-5 ring-1 ring-green-200 sm:p-6">
          <p className="flex items-start gap-2 text-lg font-semibold text-navy-950">
            <CircleCheckBig className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
            {t("orderPage.placedTitle", { number: `\u2066${order.number}\u2069` })}
          </p>
          <p className="mt-2 text-ink-muted">{t("orderPage.placedHelp")}</p>
          <a href={wa} target="_blank" rel="noopener noreferrer" className={buttonClasses("whatsapp", "md", "mt-4")}>
            <WhatsAppIcon className="size-4" />
            {t("orderPage.messageUs")}
          </a>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <h1 className="ltr-value text-h2 font-semibold text-heading">{order.number}</h1>
        <StatusBadge status={order.status} />
      </div>
      <p className="mt-1 text-sm text-ink-muted">{t("account.placedOn", { date: when(order.createdAt) })}</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-8">
          <section aria-labelledby="items-h">
            <h2 id="items-h" className="text-lg font-semibold text-navy-950">
              {t("orderPage.items")}
            </h2>
            <ul className="mt-3 divide-y divide-line rounded-2xl ring-1 ring-line">
              {items.map((it) => {
                const f = fileFor(it.uploadId);
                return (
                  <li key={it.id} className="flex gap-4 p-4 sm:p-5">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-navy-950">
                        {t(`products.${it.productId}.name`)} <span className="text-ink-muted">× {it.quantity}</span>
                      </p>
                      <div className="mt-1">
                        <ItemSummary request={it.options as QuoteRequest} design={it.design as Partial<Design>} file={f ? { name: f.originalName, pages: f.pages } : null} />
                      </div>
                    </div>
                    <p className="ltr-value shrink-0 font-medium tabular-nums text-navy-950">{formatAED(it.lineTotal, locale)}</p>
                  </li>
                );
              })}
            </ul>
            <dl className="mt-3 space-y-1.5 rounded-2xl bg-navy-50/60 p-4 text-sm sm:p-5">
              <div className="flex justify-between">
                <dt className="text-ink-muted">{t("orderPage.goods")}</dt>
                <dd className="ltr-value tabular-nums">{formatAED(order.goodsSubtotal, locale)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-muted">{t("orderPage.delivery")}</dt>
                <dd>{order.deliveryFee === null ? t("checkout.tbc") : <span className="ltr-value">{formatAED(order.deliveryFee, locale)}</span>}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-2 text-base font-semibold text-navy-950">
                <dt>{t("orderPage.total")}</dt>
                <dd className="ltr-value tabular-nums">{formatAED(order.total, locale)}</dd>
              </div>
            </dl>
          </section>

          {files.length > 0 && (
            <section aria-labelledby="files-h">
              <h2 id="files-h" className="text-lg font-semibold text-navy-950">
                {t("orderPage.files")}
              </h2>
              <ul className="mt-3 space-y-2">
                {files.map((f) => (
                  <li key={f.uploadId} className="flex items-center gap-2 text-sm text-ink-muted">
                    <FileText className="size-4 text-brand-600" aria-hidden="true" />
                    <span dir="auto">{f.originalName}</span> · {f.pages}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="min-w-0 space-y-8">
          {justPaid && (
            <p role="status" className="rounded-2xl bg-success-bg p-4 text-sm text-navy-950 ring-1 ring-green-200">
              {t("orderPage.paidThanks")}
            </p>
          )}
          {payable && !justPaid && (
            <section className="space-y-3 rounded-2xl bg-brand-50 p-5 ring-1 ring-brand-200">
              <p className="font-medium text-navy-950">{serverEnv.paymentsEnabled ? t("orderPage.payNext") : t("orderPage.payLater")}</p>
              {serverEnv.paymentsEnabled && <PayButton number={order.number} amount={formatAED(order.total, locale)} />}
            </section>
          )}
          <section aria-labelledby="progress-h">
            <h2 id="progress-h" className="text-lg font-semibold text-navy-950">
              {t("orderPage.progress")}
            </h2>
            {order.status === "cancelled" ? (
              <p className="mt-3 text-ink-muted">{t("orderStatus.cancelled")}</p>
            ) : (
              <ol className="mt-4 space-y-0">
                {FLOW.map((s, i) => {
                  const done = currentIdx >= i;
                  const at = reached.get(s);
                  return (
                    <li key={s} className="relative flex gap-3 pb-5 last:pb-0">
                      {i < FLOW.length - 1 && (
                        <span className={cn("absolute start-[11px] top-6 h-[calc(100%-1rem)] w-0.5", currentIdx > i ? "bg-brand-500" : "bg-line")} aria-hidden="true" />
                      )}
                      <span
                        className={cn(
                          "relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full ring-2",
                          done ? "bg-brand-500 text-white ring-brand-500" : "bg-white ring-line",
                        )}
                        aria-hidden="true"
                      >
                        {done && <Check className="size-3.5" />}
                      </span>
                      <div>
                        <p className={cn("text-sm font-medium", done ? "text-navy-950" : "text-ink-subtle")}>
                          {t(`orderStatus.${s}`)}
                          <span className="sr-only">{done ? " ✓" : ""}</span>
                        </p>
                        {at && <p className="text-xs text-ink-subtle">{when(at)}</p>}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          {notes.length > 0 && (
            <section aria-labelledby="updates-h">
              <h2 id="updates-h" className="text-lg font-semibold text-navy-950">
                {t("orderPage.updates")}
              </h2>
              <ul className="mt-3 space-y-3">
                {notes.map((e, i) => (
                  <li key={i} className="text-sm">
                    <p className="whitespace-pre-line text-navy-950" dir="auto">
                      {e.note === "payment_received" ? t("orderPage.payment_received") : e.note}
                    </p>
                    <p className="text-xs text-ink-subtle">{when(e.createdAt)}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section aria-labelledby="details-h" className="space-y-4 rounded-2xl p-5 ring-1 ring-line">
            <h2 id="details-h" className="sr-only">
              {t("orderPage.contact")}
            </h2>
            <div>
              <p className="text-sm text-ink-subtle">{t("orderPage.contact")}</p>
              <p className="text-navy-950">{order.contactName}</p>
              <p className="ltr-value text-sm text-ink-muted">{formatPhone(order.contactPhone)}</p>
            </div>
            <div>
              <p className="text-sm text-ink-subtle">{t("orderPage.fulfilment")}</p>
              <p className="text-navy-950">
                {t(`checkout.${order.fulfilment}`)}
                {order.emirate && ` · ${t(`emirates.${order.emirate}`)}`}
              </p>
              {order.address && (
                <p className="text-sm text-ink-muted" dir="auto">
                  {order.address}
                </p>
              )}
            </div>
            <div>
              <p className="text-sm text-ink-subtle">{t("orderPage.payment")}</p>
              <p className="text-navy-950">{t(`paymentStatus.${order.paymentStatus}`)}</p>
            </div>
            {order.customerNote && (
              <div>
                <p className="text-sm text-ink-subtle">{t("orderPage.note")}</p>
                <p className="whitespace-pre-line text-sm text-navy-950" dir="auto">
                  {order.customerNote}
                </p>
              </div>
            )}
            <a href={wa} target="_blank" rel="noopener noreferrer" className={buttonClasses("whatsapp", "md", "w-full")}>
              <WhatsAppIcon className="size-4" />
              {t("orderPage.messageUs")}
            </a>
          </section>
        </aside>
      </div>
    </div>
  );
}
