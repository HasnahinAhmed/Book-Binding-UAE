import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/db";
import { orderStatus } from "@/db/schema";
import { StatusBadge } from "@/components/account/status-badge";
import { formatPhone } from "@/config/site";
import { Link } from "@/i18n/navigation";
import { requireStaffPage } from "@/lib/admin/guard";
import { listOrdersForStaff, type OrderStatus } from "@/lib/admin/orders";
import { cn } from "@/lib/cn";
import { formatAED } from "@/lib/pricing/money";
import { inputClasses } from "@/components/ui/text-field";
import { buttonClasses } from "@/components/ui/button";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ status?: string; q?: string }> };

export default async function AdminOrdersPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireStaffPage(locale, "/admin");
  const sp = await searchParams;
  const status = (orderStatus.enumValues as readonly string[]).includes(sp.status ?? "") ? (sp.status as OrderStatus) : undefined;
  const q = (sp.q ?? "").slice(0, 100);
  const orders = await listOrdersForStaff(db, { status, q });
  const t = await getTranslations();
  const format = await getFormatter();
  const qs = (s?: string) => {
    const p = new URLSearchParams();
    if (s) p.set("status", s);
    if (q) p.set("q", q);
    const str = p.toString();
    return str ? `/admin?${str}` : "/admin";
  };

  return (
    <div className="space-y-5">
      <form method="get" className="flex flex-wrap gap-2" role="search">
        {status && <input type="hidden" name="status" value={status} />}
        <label className="sr-only" htmlFor="admin-q">
          {t("admin.search")}
        </label>
        <input id="admin-q" name="q" defaultValue={q} placeholder={t("admin.search")} className={cn(inputClasses, "h-11 max-w-md flex-1")} />
        <button type="submit" className={buttonClasses("secondary", "md")}>
          {t("admin.searchBtn")}
        </button>
      </form>
      <nav className="flex flex-wrap gap-1" aria-label={t("admin.status")}>
        {[undefined, ...orderStatus.enumValues].map((s) => (
          <Link
            key={s ?? "all"}
            href={qs(s)}
            aria-current={s === status ? "page" : undefined}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium",
              s === status ? "bg-navy-900 text-white" : "text-ink-muted ring-1 ring-line hover:bg-navy-50",
            )}
          >
            {s ? t(`orderStatus.${s}`) : t("admin.all")}
          </Link>
        ))}
      </nav>

      {orders.length === 0 ? (
        <p className="rounded-2xl bg-navy-50/60 p-6 text-ink-muted">{t("admin.none")}</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl ring-1 ring-line">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-navy-50/60 text-ink-subtle">
              <tr>
                {["order.title", "admin.customer", "admin.placed", "admin.status", "admin.payment", "admin.total"].map((k) => (
                  <th key={k} scope="col" className="px-4 py-2.5 text-start font-medium">
                    {k === "order.title" ? "#" : t(k)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-navy-50/40">
                  <td className="px-4 py-3">
                    <Link href={`/admin/orders/${o.number}`} className="ltr-value font-semibold text-brand-700 hover:underline">
                      {o.number}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-navy-950" dir="auto">
                      {o.contactName}
                    </p>
                    <p className="ltr-value text-ink-subtle">{formatPhone(o.contactPhone)}</p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-ink-muted">{format.dateTime(o.createdAt, { dateStyle: "medium", timeStyle: "short" })}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{t(`paymentStatus.${o.paymentStatus}`)}</td>
                  <td className="ltr-value px-4 py-3 text-end font-medium whitespace-nowrap tabular-nums">
                    {formatAED(o.total, locale)}
                    {o.deliveryFee === null && <span className="text-warning">*</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
