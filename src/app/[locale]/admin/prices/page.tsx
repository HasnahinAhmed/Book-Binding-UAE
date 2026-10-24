import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireStaffPage } from "@/lib/admin/guard";
import { ADDONS, PRINT_RATES, PRODUCT_ORDER, PRODUCTS } from "@/lib/pricing/catalog";
import { formatAED } from "@/lib/pricing/money";

type Props = { params: Promise<{ locale: string }> };

export default async function AdminPricesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireStaffPage(locale, "/admin/prices");
  const t = await getTranslations();
  const th = "px-4 py-2.5 text-start font-medium";
  const td = "px-4 py-3";
  return (
    <div className="space-y-8">
      <p className="max-w-3xl text-ink-muted">{t("admin.priceList.lead")}</p>
      <div className="overflow-x-auto rounded-2xl ring-1 ring-line">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-navy-50/60 text-ink-subtle">
            <tr>
              <th className={th}>{t("admin.priceList.product")}</th>
              <th className={th}>{t("admin.priceList.price")}</th>
              <th className={th}>{t("admin.priceList.min")}</th>
              <th className={th}>{t("admin.priceList.source")}</th>
              <th className={th}>{t("admin.priceList.status")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {PRODUCT_ORDER.map((id) => {
              const p = PRODUCTS[id];
              return (
                <tr key={id}>
                  <td className={td}>{t(`products.${id}.name`)}</td>
                  <td className={`${td} ltr-value tabular-nums`}>{p.tiers.map((tier) => `${tier.minQty}+: ${formatAED(tier.unitPrice, locale)}`).join(" · ")}</td>
                  <td className={td}>{p.minQty}</td>
                  <td className={`${td} text-ink-muted`}>{p.priceSource}</td>
                  <td className={td}>{p.priceStatus === "confirmed" ? t("admin.priceList.confirmed") : p.priceStatus}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-2xl p-5 ring-1 ring-line">
          <h2 className="font-semibold text-navy-950">{t("admin.priceList.printing")}</h2>
          <ul className="mt-3 space-y-1 text-sm">
            {(["80gsm", "120gsm"] as const).map((paper) => (
              <li key={paper} className="ltr-value">
                {t(`quote.paper.${paper}`)}: {t("quote.mode.color")} {formatAED(PRINT_RATES[paper].color, locale)} · {t("quote.mode.bw")}{" "}
                {formatAED(PRINT_RATES[paper].bw, locale)}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl p-5 ring-1 ring-line">
          <h2 className="font-semibold text-navy-950">{t("admin.priceList.addons")}</h2>
          <ul className="mt-3 space-y-1 text-sm">
            <li>
              {t("quote.spine")}: <span className="ltr-value">{formatAED(ADDONS.spinePrinting.price, locale)}</span>
            </li>
            <li>
              {t("quote.corners")}: <span className="ltr-value">{formatAED(ADDONS.metalCorners.price, locale)}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
