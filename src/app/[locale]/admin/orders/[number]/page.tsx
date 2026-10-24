import { notFound } from "next/navigation";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, Download, FileText } from "lucide-react";
import { db } from "@/db";
import { OrderActions } from "@/components/admin/order-actions";
import { StatusBadge } from "@/components/account/status-badge";
import { ItemSummary } from "@/components/cart/item-summary";
import { WhatsAppIcon } from "@/components/icons/whatsapp";
import { buttonClasses } from "@/components/ui/button";
import { formatPhone } from "@/config/site";
import { Link } from "@/i18n/navigation";
import { requireStaffPage } from "@/lib/admin/guard";
import { getOrderForStaff, NEXT_STATUS } from "@/lib/admin/orders";
import type { Design } from "@/lib/cart/schema";
import { formatAED } from "@/lib/pricing/money";
import type { QuoteRequest } from "@/lib/quote/server-quote";

type Props = { params: Promise<{ locale: string; number: string }> };

const TEXT_FIELDS = ["university", "universityAr", "college", "title", "titleAr", "author", "authorAr", "supervisor", "year"] as const;

export default async function AdminOrderPage({ params }: Props) {
  const { locale, number } = await params;
  setRequestLocale(locale);
  await requireStaffPage(locale, `/admin/orders/${number}`);
  const data = await getOrderForStaff(db, number);
  if (!data) notFound();
  const { order, items, events, files, audit } = data;
  const t = await getTranslations();
  const format = await getFormatter();
  const when = (d: Date) => format.dateTime(d, { dateStyle: "medium", timeStyle: "short" });
  const fileFor = (id: string | null) => files.find((f) => f.uploadId === id);

  return (
    <div>
      <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-navy-950">
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
        {t("admin.order.back")}
      </Link>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="ltr-value text-h2 font-semibold text-navy-950">{order.number}</h1>
        <StatusBadge status={order.status} />
        <span className="text-sm text-ink-muted">{t(`paymentStatus.${order.paymentStatus}`)}</span>
      </div>
      <p className="mt-1 text-sm text-ink-muted">{when(order.createdAt)}</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-8">
          <section className="grid gap-4 rounded-2xl p-5 ring-1 ring-line sm:grid-cols-2">
            <div>
              <p className="text-sm text-ink-subtle">{t("admin.order.customer")}</p>
              <p className="font-medium text-navy-950" dir="auto">
                {order.contactName}
              </p>
              <p className="ltr-value text-sm text-ink-muted">{formatPhone(order.contactPhone)}</p>
              <p className="text-sm text-ink-muted" dir="ltr">
                {order.contactEmail}
              </p>
              <a
                href={`https://wa.me/${order.contactPhone}?text=${encodeURIComponent(`${order.number}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClasses("whatsapp", "sm", "mt-3")}
              >
                <WhatsAppIcon className="size-4" />
                {t("admin.order.whatsapp")}
              </a>
            </div>
            <div>
              <p className="text-sm text-ink-subtle">{t("orderPage.fulfilment")}</p>
              <p className="text-navy-950">
                {t(`checkout.${order.fulfilment}`)}
                {order.emirate && ` · ${t(`emirates.${order.emirate}`)}`}
              </p>
              {order.address && (
                <p className="text-sm whitespace-pre-line text-ink-muted" dir="auto">
                  {order.address}
                </p>
              )}
              {order.customerNote && (
                <>
                  <p className="mt-3 text-sm text-ink-subtle">{t("orderPage.note")}</p>
                  <p className="text-sm whitespace-pre-line text-navy-950" dir="auto">
                    {order.customerNote}
                  </p>
                </>
              )}
            </div>
          </section>

          <section aria-labelledby="ai-h">
            <h2 id="ai-h" className="text-lg font-semibold text-navy-950">
              {t("admin.order.items")}
            </h2>
            <ul className="mt-3 space-y-4">
              {items.map((it) => {
                const design = it.design as Partial<Design>;
                const f = fileFor(it.uploadId);
                const textRows = TEXT_FIELDS.filter((k) => design.text?.[k]?.trim());
                return (
                  <li key={it.id} className="rounded-2xl p-5 ring-1 ring-line">
                    <div className="flex justify-between gap-4">
                      <p className="font-medium text-navy-950">
                        {t(`products.${it.productId}.name`)} × {it.quantity}
                      </p>
                      <p className="ltr-value font-medium tabular-nums">{formatAED(it.lineTotal, locale)}</p>
                    </div>
                    <div className="mt-1">
                      <ItemSummary request={it.options as QuoteRequest} design={null} file={f ? { name: f.originalName, pages: f.pages } : null} />
                    </div>
                    {design.language && (
                      <p className="mt-2 text-sm text-ink-muted">
                        {t("admin.order.language")}: {t({ en: "builder.langEn", ar: "builder.langAr", both: "builder.langBoth" }[design.language])} ·{" "}
                        {t("admin.order.direction")}: {design.direction ?? "auto"}
                      </p>
                    )}
                    {textRows.length > 0 && (
                      <dl className="mt-3 divide-y divide-line rounded-xl bg-navy-50/50 text-sm">
                        {textRows.map((k) => (
                          <div key={k} className="grid grid-cols-[minmax(0,9rem)_1fr] gap-3 px-3 py-2">
                            <dt className="text-ink-subtle">{t(`builder.fields.${k}`)}</dt>
                            <dd className="min-w-0 font-medium break-words text-navy-950 select-all" dir="auto">
                              {design.text![k]}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    )}
                    {design.hasLogo && <p className="mt-2 text-sm text-warning">{t("admin.order.logo")}</p>}
                    {!it.uploadId && (it.options as QuoteRequest).printing && <p className="mt-2 text-sm text-ink-subtle">{t("admin.order.noFiles")}</p>}
                  </li>
                );
              })}
            </ul>
            <dl className="mt-3 space-y-1 rounded-2xl bg-navy-50/60 p-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-muted">{t("orderPage.goods")}</dt>
                <dd className="ltr-value tabular-nums">{formatAED(order.goodsSubtotal, locale)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-muted">{t("orderPage.delivery")}</dt>
                <dd>{order.deliveryFee === null ? t("checkout.tbc") : <span className="ltr-value">{formatAED(order.deliveryFee, locale)}</span>}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-2 font-semibold">
                <dt>{t("admin.total")}</dt>
                <dd className="ltr-value tabular-nums">{formatAED(order.total, locale)}</dd>
              </div>
            </dl>
          </section>

          <section aria-labelledby="af-h">
            <h2 id="af-h" className="text-lg font-semibold text-navy-950">
              {t("admin.order.files")}
            </h2>
            {files.length === 0 ? (
              <p className="mt-2 text-sm text-ink-muted">{t("admin.order.noFiles")}</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {files.map((f) => (
                  <li key={f.uploadId} className="flex flex-wrap items-center gap-3 rounded-xl p-3 ring-1 ring-line">
                    <FileText className="size-5 text-brand-600" aria-hidden="true" />
                    <span className="min-w-0 flex-1 text-sm" dir="auto">
                      {f.originalName} · {f.pages} · {(f.sizeBytes / 1024 / 1024).toFixed(1)} MB
                    </span>
                    <a href={`/api/admin/files/${f.uploadId}`} className={buttonClasses("secondary", "sm")}>
                      <Download className="size-4" aria-hidden="true" />
                      {t("admin.order.download")}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="at-h">
            <h2 id="at-h" className="text-lg font-semibold text-navy-950">
              {t("admin.order.timeline")}
            </h2>
            <ol className="mt-3 space-y-3 border-s-2 border-line ps-4">
              {events.map((e) => (
                <li key={e.id} className="text-sm">
                  <p className="font-medium text-navy-950">
                    {e.status ? t(`orderStatus.${e.status}`) : "—"}
                    {!e.public && <span className="ms-2 rounded bg-navy-100 px-1.5 py-0.5 text-xs text-navy-700">{t("admin.order.internal")}</span>}
                  </p>
                  {e.note && (
                    <p className="text-ink-muted whitespace-pre-line" dir="auto">
                      {e.note === "payment_received" ? t("orderPage.payment_received") : e.note}
                    </p>
                  )}
                  <p className="text-xs text-ink-subtle">
                    {when(e.createdAt)}
                    {e.actor && ` · ${e.actor}`}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="aa-h">
            <h2 id="aa-h" className="text-lg font-semibold text-navy-950">
              {t("admin.order.audit")}
            </h2>
            <ul className="mt-3 space-y-1 text-xs text-ink-muted">
              {audit.map((a, i) => (
                <li key={i} className="font-mono">
                  {when(a.createdAt)} · {a.actor ?? "—"} · {a.action} · {JSON.stringify(a.data)}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <h2 className="sr-only">{t("admin.order.actions")}</h2>
          <OrderActions
            key={`${order.status}-${order.paymentStatus}-${order.deliveryFee}`}
            orderId={order.id}
            status={order.status}
            nextStatuses={NEXT_STATUS[order.status]}
            deliveryFee={order.deliveryFee}
            paymentStatus={order.paymentStatus}
          />
        </aside>
      </div>
    </div>
  );
}
