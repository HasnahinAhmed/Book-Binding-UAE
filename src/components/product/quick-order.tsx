"use client";

import { useId, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AlertCircle } from "lucide-react";
import { ADDONS, type CornerOption, type FoilTone, type PaperId, type PrintMode, type Product } from "@/lib/pricing/catalog";
import { calculateQuote, quoteInputSchema } from "@/lib/pricing/quote";
import { formatAED } from "@/lib/pricing/money";
import { buildWhatsappOrderText } from "@/lib/order/whatsapp-message";
import { whatsappLink } from "@/config/site";
import { buttonClasses } from "@/components/ui/button";
import { Fieldset, Segmented, Stepper, Switch, SwatchGroup } from "@/components/ui/form-controls";
import { WhatsAppIcon } from "@/components/icons/whatsapp";
import { PriceBreakdown } from "./price-breakdown";

export function QuickOrder({ product }: { product: Product }) {
  const t = useTranslations();
  const locale = useLocale();
  const qtyHelpId = useId();
  const pagesId = useId();
  const pagesHelpId = useId();

  const [coverColorId, setCover] = useState(product.coverColors[0]!.id);
  const [boxColorId, setBox] = useState(product.boxColors?.[0]?.id);
  const [foilTone, setFoil] = useState<FoilTone | undefined>(product.foilTones[0]);
  const [quantity, setQty] = useState(product.minQty);
  const [spinePrinting, setSpine] = useState(false);
  const [corners, setCorners] = useState<CornerOption>("none");
  const [printOn, setPrintOn] = useState(true);
  const [pages, setPages] = useState(120);
  const [paper, setPaper] = useState<PaperId>("80gsm");
  const [mode, setMode] = useState<PrintMode>("bw");

  const input = useMemo(
    () => ({
      productId: product.id,
      quantity,
      coverColorId,
      boxColorId,
      foilTone,
      spinePrinting,
      corners,
      printing: printOn ? { pages, paper, mode } : null,
    }),
    [product.id, quantity, coverColorId, boxColorId, foilTone, spinePrinting, corners, printOn, pages, paper, mode],
  );
  const result = calculateQuote(input);

  const colorOptions = (list: Product["coverColors"]) => list.map((c) => ({ ...c, label: t(`colors.${c.id}`) }));

  const waHref = result.ok
    ? whatsappLink(
        buildWhatsappOrderText({
          t: (k, v) => t(k, v),
          locale,
          product,
          productName: t(`products.${product.id}.name`),
          input: quoteInputSchema.parse(input),
          quote: result.quote,
          pageUrl: typeof window !== "undefined" ? window.location.href.split("#")[0] : undefined,
        }),
      )
    : undefined;

  return (
    <form className="space-y-8" onSubmit={(e) => e.preventDefault()} aria-label={t("order.title")}>
      <Fieldset legend={t("order.coverColor")} help={product.moreColorsOnRequest ? t("order.moreColors") : undefined}>
        <SwatchGroup name="cover" value={coverColorId} onChange={setCover} options={colorOptions(product.coverColors)} />
      </Fieldset>

      {product.boxColors && boxColorId && (
        <Fieldset legend={t("order.boxColor")}>
          <SwatchGroup name="box" value={boxColorId} onChange={setBox} options={colorOptions(product.boxColors)} />
        </Fieldset>
      )}

      {product.foilTones.length > 0 && foilTone && (
        <Fieldset legend={t("order.foil")}>
          <Segmented
            name="foil"
            value={foilTone}
            onChange={setFoil}
            options={product.foilTones.map((f) => ({ value: f, label: t(`colors.${f}`) }))}
          />
        </Fieldset>
      )}

      <div>
        <label htmlFor={`${qtyHelpId}-qty`} className="text-sm font-semibold text-navy-950">
          {t("order.quantity")}
        </label>
        <div className="mt-3 flex items-center gap-4">
          <Stepper
            id={`${qtyHelpId}-qty`}
            value={quantity}
            min={product.minQty}
            max={500}
            onChange={setQty}
            decLabel={t("order.decrease")}
            incLabel={t("order.increase")}
            describedBy={qtyHelpId}
          />
          {product.minQty > 1 && (
            <p id={qtyHelpId} className="text-sm text-ink-subtle">
              {t("order.quantityHelp", { min: product.minQty })}
            </p>
          )}
        </div>
      </div>

      <Fieldset legend={t("order.extras")}>
        <div className="space-y-5 rounded-xl p-4 ring-1 ring-line">
          <Switch checked={spinePrinting} onChange={setSpine} label={t("order.spine")} description={t("home.perBook", { price: formatAED(ADDONS.spinePrinting.price, locale) })} />
          <div>
            <p className="mb-2 font-medium text-navy-950" id="corners-label">
              {t("order.corners")} <span className="text-sm font-normal text-ink-subtle">· {t("home.perBook", { price: formatAED(ADDONS.metalCorners.price, locale) })}</span>
            </p>
            <Segmented
              name="corners"
              value={corners}
              onChange={setCorners}
              options={[
                { value: "none", label: t("order.cornersNone") },
                { value: "gold", label: t("colors.gold") },
                { value: "silver", label: t("colors.silver") },
              ]}
            />
          </div>
        </div>
      </Fieldset>

      <Fieldset legend={t("order.printingTitle")}>
        <div className="space-y-5 rounded-xl p-4 ring-1 ring-line">
          <Switch checked={printOn} onChange={setPrintOn} label={t("order.printingToggle")} description={t("order.printingHelp")} />
          {printOn && (
            <>
              <div>
                <label htmlFor={pagesId} className="font-medium text-navy-950">
                  {t("order.pages")}
                </label>
                <input
                  id={pagesId}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={2000}
                  value={pages}
                  aria-describedby={pagesHelpId}
                  aria-invalid={pages < 1 || pages > 2000 || !Number.isInteger(pages)}
                  onChange={(e) => setPages(e.target.value === "" ? 0 : Math.floor(Number(e.target.value)))}
                  className="ltr-value mt-2 block h-11 w-36 rounded-lg bg-white px-3 text-base tabular-nums text-navy-950 ring-1 ring-line focus:ring-2 focus:ring-brand-500 focus:outline-none aria-[invalid=true]:ring-danger"
                />
                <p id={pagesHelpId} className="mt-1.5 text-sm text-ink-subtle">
                  {t("order.pagesHelp")}
                </p>
              </div>
              <div className="flex flex-wrap gap-x-8 gap-y-4">
                <div>
                  <p className="mb-2 text-sm font-medium text-navy-950">{t("order.paper")}</p>
                  <Segmented
                    name="paper"
                    value={paper}
                    onChange={setPaper}
                    options={[
                      { value: "80gsm", label: t("quote.paper.80gsm") },
                      { value: "120gsm", label: t("quote.paper.120gsm") },
                    ]}
                  />
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium text-navy-950">{t("order.mode")}</p>
                  <Segmented
                    name="mode"
                    value={mode}
                    onChange={setMode}
                    options={[
                      { value: "bw", label: t("order.bw") },
                      { value: "color", label: t("order.color") },
                    ]}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </Fieldset>

      <div aria-live="polite">
        {result.ok ? (
          <PriceBreakdown quote={result.quote} />
        ) : (
          <p role="alert" className="flex items-start gap-2 rounded-xl bg-danger-bg p-4 text-sm text-danger">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {result.error.code === "below_minimum" ? t("order.belowMin", { min: result.error.minQty }) : t("order.invalid")}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <a
          href={waHref}
          aria-disabled={!waHref}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClasses("whatsapp", "lg", `w-full ${waHref ? "" : "pointer-events-none opacity-50"}`)}
        >
          <WhatsAppIcon className="size-5" />
          {t("order.sendWhatsapp")}
        </a>
        <p className="text-sm text-ink-subtle">{t("order.whatsappNote")}</p>
      </div>
    </form>
  );
}
