import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { ChevronRight, Package, Palette } from "lucide-react";
import { db, schema } from "@/db";
import { DeleteDesignButton } from "@/components/account/delete-design-button";
import { SignOutButton } from "@/components/account/sign-out-button";
import { StatusBadge } from "@/components/account/status-badge";
import { buttonClasses } from "@/components/ui/button";
import { Link, redirect } from "@/i18n/navigation";
import { currentSession } from "@/lib/auth";
import { listOrdersForUser } from "@/lib/orders/queries";
import { formatAED } from "@/lib/pricing/money";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "account" });
  return { title: t("metaTitle"), robots: { index: false } };
}

export default async function AccountPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await currentSession();
  if (!session) return redirect({ href: "/account/sign-in?next=/account", locale });

  const [t, format] = [await getTranslations(), await getFormatter()];
  const [orders, designs] = await Promise.all([
    listOrdersForUser(db, session.user.id),
    db
      .select({ id: schema.savedDesigns.id, name: schema.savedDesigns.name, updatedAt: schema.savedDesigns.updatedAt })
      .from(schema.savedDesigns)
      .where(eq(schema.savedDesigns.userId, session.user.id))
      .orderBy(desc(schema.savedDesigns.updatedAt))
      .limit(50),
  ]);
  const date = (d: Date) => format.dateTime(d, { dateStyle: "medium" });

  return (
    <div className="container-page py-10 lg:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-h2 font-semibold text-navy-950">{t("account.title")}</h1>
          <p className="mt-1 text-ink-muted">
            {t("account.signedInAs", { email: `\u2068${session.user.email}\u2069` })}
          </p>
        </div>
        <SignOutButton />
      </div>

      <section aria-labelledby="orders-h" className="mt-10">
        <h2 id="orders-h" className="flex items-center gap-2 text-lg font-semibold text-navy-950">
          <Package className="size-5 text-brand-600" aria-hidden="true" />
          {t("account.orders")}
        </h2>
        {orders.length === 0 ? (
          <div className="mt-4 rounded-2xl bg-navy-50/60 p-6 text-ink-muted">
            <p>{t("account.noOrders")}</p>
            <Link href="/thesis-builder" className={buttonClasses("primary", "md", "mt-4")}>
              {t("cart.openBuilder")}
            </Link>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-line rounded-2xl ring-1 ring-line">
            {orders.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/account/orders/${o.number}`}
                  className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4 hover:bg-navy-50/50"
                  aria-label={`${t("account.view")} ${o.number}`}
                >
                  <span className="ltr-value font-semibold text-navy-950">{o.number}</span>
                  <span className="text-sm text-ink-muted">{t("account.placedOn", { date: date(o.createdAt) })}</span>
                  <StatusBadge status={o.status} />
                  <span className="ltr-value ms-auto font-medium tabular-nums text-navy-950">{formatAED(o.total, locale)}</span>
                  <ChevronRight className="size-4 text-ink-subtle rtl:rotate-180" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="designs-h" className="mt-12">
        <h2 id="designs-h" className="flex items-center gap-2 text-lg font-semibold text-navy-950">
          <Palette className="size-5 text-brand-600" aria-hidden="true" />
          {t("account.designs")}
        </h2>
        {designs.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-navy-50/60 p-6 text-ink-muted">{t("account.noDesigns")}</p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {designs.map((d) => (
              <li key={d.id} className="flex items-center gap-3 rounded-2xl p-4 ring-1 ring-line">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-navy-950" dir="auto">
                    {d.name}
                  </p>
                  <p className="text-sm text-ink-subtle">{t("account.updated", { date: date(d.updatedAt) })}</p>
                  <Link href={`/thesis-builder?design=${d.id}`} className="mt-1 inline-block text-sm font-medium text-brand-700 hover:underline">
                    {t("account.open")}
                  </Link>
                </div>
                <DeleteDesignButton id={d.id} name={d.name} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
