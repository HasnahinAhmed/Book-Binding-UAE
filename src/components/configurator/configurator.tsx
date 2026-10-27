"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { AlertCircle, ArrowLeft, ArrowRight, Check, ImagePlus, RotateCcw, ShieldCheck, X } from "lucide-react";
import { ADDONS, PRODUCTS, PRODUCT_ORDER, type Product, type ProductId } from "@/lib/pricing/catalog";
import { calculateQuote, quoteInputSchema } from "@/lib/pricing/quote";
import { formatAED } from "@/lib/pricing/money";
import { imageInfo } from "@/lib/images";
import { startingPrice } from "@/lib/products";
import {
  initialState,
  switchProduct,
  toBookConfig,
  toQuoteInput,
  toQuoteRequest,
  savedStateSchema,
  type ConfiguratorState,
  type CoverText,
} from "@/lib/configurator/state";
import { coverTextLines } from "@/lib/configurator/whatsapp";
import { buildWhatsappOrderText } from "@/lib/order/whatsapp-message";
import { whatsappLink } from "@/config/site";
import { cn } from "@/lib/cn";
import { Button, buttonClasses } from "@/components/ui/button";
import { Fieldset, Segmented, Stepper, Switch, SwatchGroup } from "@/components/ui/form-controls";
import { WhatsAppIcon } from "@/components/icons/whatsapp";
import { PriceBreakdown } from "@/components/product/price-breakdown";
import { BookPreview } from "./book-preview";
import { useMobilePreview } from "./use-mobile-preview";
import { PdfUpload } from "./pdf-upload";
import { useServerQuote } from "./use-server-quote";
import { SaveDesign } from "./save-design";
import { AddToCart } from "@/components/cart/add-to-cart";

const STEPS = ["product", "cover", "text", "printing", "review"] as const;
type Step = (typeof STEPS)[number];
const DRAFT_KEY = "bbu-builder-draft-v1";
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

function loadDraft(initialProduct: ProductId): ConfiguratorState {
  const base = initialState(initialProduct);
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return base;
    const d = JSON.parse(raw) as Partial<ConfiguratorState>;
    if (!d || typeof d !== "object" || !d.productId || !(d.productId in PRODUCTS)) return base;
    // A product chosen in the URL wins over the saved draft's product.
    const merged = { ...base, ...d, printing: { ...base.printing, ...d.printing }, logoDataUrl: "" } as ConfiguratorState;
    const s = merged.productId === initialProduct ? merged : switchProduct(merged, initialProduct);
    return calculateQuote(toQuoteInput(s)).ok ? s : base;
  } catch {
    return base;
  }
}

export function Configurator({
  initialProduct,
  productFromUrl,
  designId,
}: {
  initialProduct: ProductId;
  productFromUrl: boolean;
  designId?: string;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const { isMobile, keyboardOpen } = useMobilePreview();
  const [state, setState] = useState<ConfiguratorState>(() => initialState(initialProduct));
  const [step, setStep] = useState<Step>(productFromUrl ? "cover" : "product");
  const [compact, setCompact] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Restore a saved draft once on the client (localStorage is unavailable during SSR).
  const [loadError, setLoadError] = useState(false);
  useEffect(() => {
    if (designId) {
      // Open a design saved to the customer's account.
      const ac = new AbortController();
      fetch(`/api/designs/${encodeURIComponent(designId)}`, { signal: ac.signal })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((json: { design?: { state?: unknown } }) => {
          const parsed = savedStateSchema.safeParse(json.design?.state);
          if (!parsed.success) throw new Error("invalid");
          const base = initialState(parsed.data.productId);
          setState({ ...base, ...parsed.data, printing: { ...base.printing, ...parsed.data.printing } });
          setStep("review");
        })
        .catch(() => {
          if (!ac.signal.aborted) setLoadError(true);
        })
        .finally(() => setHydrated(true));
      return () => ac.abort();
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time client-only restore
    setState(loadDraft(initialProduct));
    setHydrated(true);
  }, [initialProduct, designId]);

  useEffect(() => {
    if (!hydrated) return;
    const id = window.setTimeout(() => {
      try {
        const { logoDataUrl: _logo, ...rest } = state;
        void _logo;
        window.localStorage.setItem(DRAFT_KEY, JSON.stringify(rest));
      } catch {
        /* storage full or blocked: drafts are a convenience only */
      }
    }, 400);
    return () => window.clearTimeout(id);
  }, [state, hydrated]);

  const product = PRODUCTS[state.productId];
  const bookCfg = useMemo(() => toBookConfig(state, { mobile: isMobile }), [state, isMobile]);
  const quote = calculateQuote(toQuoteInput(state));
  const server = useServerQuote(toQuoteRequest(state), step === "review" && quote.ok, () =>
    setState((s) => ({ ...s, printing: { ...s.printing, upload: null } })),
  );
  const update = (patch: Partial<ConfiguratorState>) => setState((s) => ({ ...s, ...patch }));
  const updateText = (patch: Partial<CoverText>) => setState((s) => ({ ...s, text: { ...s.text, ...patch } }));

  const stepIndex = STEPS.indexOf(step);
  const goTo = (s: Step) => {
    setStep(s);
    requestAnimationFrame(() => {
      panelRef.current?.focus({ preventScroll: true });
      if (isMobile) panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const waHref = quote.ok
    ? whatsappLink(
        [
          buildWhatsappOrderText({
            t: (k, v) => t(k, v),
            locale,
            product,
            productName: t(`products.${product.id}.name`),
            input: quoteInputSchema.parse(toQuoteInput(state)),
            quote: server.status === "ok" ? server.quote : quote.quote,
          }),
          ...(state.printing.enabled && state.printing.upload
            ? [t("order.wa.pdf", { name: state.printing.upload.name, ref: state.printing.upload.id.slice(0, 8) })]
            : []),
          ...coverTextLines(state, (k, v) => t(k, v)),
        ].join("\n"),
      )
    : undefined;

  const previewSmall = compact || keyboardOpen;
  const savable = savedStateSchema.safeParse(state);
  const fallbackImg = imageInfo(product.images.card);

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-10">
      {/* Preview: sticky on mobile (≈45% of the viewport) and on desktop. Not sticky on short/landscape screens. */}
      <div
        className={cn(
          "z-20 -mx-4 bg-white px-4 pb-3 sm:-mx-6 sm:px-6 lg:mx-0 lg:bg-transparent lg:px-0 lg:pb-0",
          "sticky top-[calc(4.5rem+env(safe-area-inset-top))] [@media(max-height:560px)]:static",
          "lg:top-24 lg:self-start",
        )}
      >
        <div
          className={cn(
            "transition-[height] duration-300 ease-[var(--ease-out-soft)]",
            previewSmall ? "h-[26svh] min-h-[160px]" : "h-[44svh] min-h-[240px] max-h-[50svh]",
            "[@media(max-height:560px)]:h-[70svh] [@media(max-height:560px)]:max-h-none",
            "lg:h-[calc(100dvh-8rem)] lg:max-h-[760px] lg:min-h-[520px]",
          )}
        >
          <BookPreview
            cfg={bookCfg}
            compact={previewSmall}
            onToggleCompact={() => setCompact((c) => !c)}
            fallback={
              <Image src={fallbackImg.src} alt="" width={fallbackImg.width} height={fallbackImg.height} className="h-40 w-auto object-contain" />
            }
          />
        </div>
        <p className="mt-2 text-xs text-ink-subtle">{t("builder.disclaimer")}</p>
      </div>

      <div className="mt-4 min-w-0 lg:mt-0">
        <ol className="-mx-4 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0" aria-label={t("builder.stepOf", { n: stepIndex + 1, total: STEPS.length })}>
          {STEPS.map((s, i) => (
            <li key={s} className="shrink-0">
              <button
                type="button"
                onClick={() => goTo(s)}
                aria-current={s === step ? "step" : undefined}
                className={cn(
                  "flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors",
                  s === step ? "bg-brand-600 text-white shadow-sm" : "text-ink-muted hover:bg-navy-50 hover:text-ink",
                )}
              >
                <span
                  className={cn(
                    "flex size-5 items-center justify-center rounded-full text-[0.6875rem]",
                    s === step ? "bg-white/20" : i < stepIndex ? "bg-brand-100 text-brand-800" : "bg-navy-100",
                  )}
                  aria-hidden="true"
                >
                  {i < stepIndex ? <Check className="size-3" /> : i + 1}
                </span>
                {t(`builder.steps.${s}`)}
              </button>
            </li>
          ))}
        </ol>

        <div
          ref={panelRef}
          tabIndex={-1}
          className="mt-5 scroll-mt-[calc(4.5rem+26svh)] rounded-2xl outline-none lg:scroll-mt-24"
          aria-labelledby="builder-step-title"
        >
          {loadError && (
            <p role="alert" className="mb-4 rounded-xl bg-danger-bg px-4 py-3 text-sm text-danger">
              {t("builder.save.loadError")}
            </p>
          )}
          <p className="text-sm text-ink-subtle">{t("builder.stepOf", { n: stepIndex + 1, total: STEPS.length })}</p>
          <h2 id="builder-step-title" className="mt-0.5 text-2xl font-semibold text-heading">
            {t(`builder.steps.${step}`)}
          </h2>
          <div className="mt-6 space-y-8">
            {step === "product" && <ProductStep value={state.productId} onChange={(id) => setState((s) => switchProduct(s, id))} />}
            {step === "cover" && <CoverStep state={state} product={product} update={update} />}
            {step === "text" && <TextStep state={state} update={update} updateText={updateText} />}
            {step === "printing" && <PrintingStep state={state} product={product} update={update} />}
            {step === "review" && (
              <div className="space-y-6">
                <Summary state={state} product={product} />
                {quote.ok ? (
                  <div className="space-y-2">
                    <PriceBreakdown quote={server.status === "ok" ? server.quote : quote.quote} />
                    <p className="flex items-center gap-1.5 text-sm text-ink-subtle" aria-live="polite">
                      {server.status === "ok" ? (
                        <>
                          <ShieldCheck className="size-4 text-success" aria-hidden="true" />
                          {t("builder.upload.checked")}
                        </>
                      ) : server.status === "loading" ? (
                        t("builder.upload.checking")
                      ) : server.status === "error" && server.code === "upload_not_found" ? (
                        <span className="text-danger">{t("builder.upload.expired")}</span>
                      ) : null}
                    </p>
                  </div>
                ) : (
                  <QuoteErrorNote code={quote.error.code} min={quote.error.code === "below_minimum" ? quote.error.minQty : 0} />
                )}
                <AddToCart
                  disabled={server.status === "error"}
                  item={
                    quote.ok
                      ? {
                          request: toQuoteRequest(state),
                          design: { language: state.language, direction: state.direction, text: state.text, hasLogo: !!state.logoDataUrl },
                          upload: state.printing.enabled ? state.printing.upload : null,
                        }
                      : null
                  }
                />
                <div className="space-y-2">
                  <a
                    href={waHref}
                    aria-disabled={!waHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonClasses("secondary", "lg", cn("w-full", !waHref && "pointer-events-none opacity-50"))}
                  >
                    <WhatsAppIcon className="size-5" />
                    {t("order.sendWhatsapp")}
                  </a>
                  <p className="text-sm text-ink-subtle">{t("order.whatsappNote")}</p>
                  <p className="text-sm text-ink-subtle">{t("builder.reviewNote")}</p>
                </div>
                {savable.success && (
                  <SaveDesign
                    state={savable.data}
                    name={state.text.title.trim() || state.text.titleAr.trim() || t(`products.${product.id}.name`)}
                  />
                )}
                <button
                  type="button"
                  onClick={() => {
                    setState(initialState(state.productId));
                    goTo("product");
                  }}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-navy-950"
                >
                  <RotateCcw className="size-4" aria-hidden="true" />
                  {t("builder.startOver")}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Step footer: running subtotal + navigation. Sticky at the bottom on mobile. */}
        <div
          className="glass glass-strong sticky bottom-0 z-10 -mx-4 mt-8 flex items-center justify-between gap-3 rounded-t-3xl px-4 py-3 sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:rounded-2xl lg:px-4"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <div className="min-w-0" aria-live="polite">
            <p className="text-xs text-ink-subtle">{t("quote.subtotal")}</p>
            <p className="ltr-value truncate text-lg font-semibold tabular-nums text-navy-950">
              {quote.ok ? formatAED(quote.quote.subtotal, locale) : "—"}
              {quote.ok && quote.quote.hasUnconfirmedPrices && <span className="text-warning">*</span>}
            </p>
          </div>
          <div className="flex gap-2">
            {stepIndex > 0 && (
              <Button variant="secondary" onClick={() => goTo(STEPS[stepIndex - 1]!)} aria-label={t("builder.back")}>
                <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
                <span className="hidden sm:inline">{t("builder.back")}</span>
              </Button>
            )}
            {stepIndex < STEPS.length - 1 && (
              <Button onClick={() => goTo(STEPS[stepIndex + 1]!)}>
                {t("builder.next")}
                <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function QuoteErrorNote({ code, min }: { code: string; min: number }) {
  const t = useTranslations("order");
  return (
    <p role="alert" className="flex items-start gap-2 rounded-xl bg-danger-bg p-4 text-sm text-danger">
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      {code === "below_minimum" ? t("belowMin", { min }) : t("invalid")}
    </p>
  );
}

function ProductStep({ value, onChange }: { value: ProductId; onChange: (id: ProductId) => void }) {
  const t = useTranslations();
  const locale = useLocale();
  return (
    <fieldset>
      <legend className="sr-only">{t("builder.productLabel")}</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {PRODUCT_ORDER.map((id) => {
          const p = PRODUCTS[id];
          const img = imageInfo(p.images.card);
          return (
            <label key={id} className="relative block cursor-pointer">
              <input type="radio" name="product" value={id} checked={value === id} onChange={() => onChange(id)} className="peer sr-only" />
              <span className="flex h-full items-center gap-3 rounded-xl p-3 ring-1 ring-line transition-shadow peer-checked:ring-2 peer-checked:ring-brand-600 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-500 hover:ring-navy-200">
                <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-navy-50">
                  <Image src={img.src} alt="" width={img.width} height={img.height} sizes="64px" className="h-[90%] w-auto object-contain" />
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold text-navy-950">{t(`products.${id}.name`)}</span>
                  <span className="mt-0.5 block text-sm text-ink-subtle">
                    {t("home.from")} <span className="ltr-value">{formatAED(startingPrice(p), locale)}</span>{" "}
                    {t(`home.perUnit.${p.unit}`)}
                    {p.priceStatus === "unconfirmed" && <span className="text-warning">*</span>}
                  </span>
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function CoverStep({
  state,
  product,
  update,
}: {
  state: ConfiguratorState;
  product: Product;
  update: (p: Partial<ConfiguratorState>) => void;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const opts = (list: Product["coverColors"]) => list.map((c) => ({ ...c, label: t(`colors.${c.id}`) }));
  return (
    <>
      <Fieldset legend={t("order.coverColor")} help={product.moreColorsOnRequest ? t("order.moreColors") : undefined}>
        <SwatchGroup name="b-cover" value={state.coverColorId} onChange={(v) => update({ coverColorId: v })} options={opts(product.coverColors)} />
      </Fieldset>
      {product.boxColors && state.boxColorId && (
        <Fieldset legend={t("order.boxColor")}>
          <SwatchGroup name="b-box" value={state.boxColorId} onChange={(v) => update({ boxColorId: v })} options={opts(product.boxColors)} />
        </Fieldset>
      )}
      {product.foilTones.length > 0 && state.foilTone && (
        <Fieldset legend={t("order.foil")}>
          <Segmented
            name="b-foil"
            value={state.foilTone}
            onChange={(v) => update({ foilTone: v })}
            options={product.foilTones.map((f) => ({ value: f, label: t(`colors.${f}`) }))}
          />
        </Fieldset>
      )}
      <Fieldset legend={t("order.extras")}>
        <div className="space-y-5 rounded-xl p-4 ring-1 ring-line">
          <Switch
            checked={state.spinePrinting}
            onChange={(v) => update({ spinePrinting: v })}
            label={t("order.spine")}
            description={t("home.perBook", { price: formatAED(ADDONS.spinePrinting.price, locale) })}
          />
          <div>
            <p className="mb-2 font-medium text-navy-950">
              {t("order.corners")}{" "}
              <span className="text-sm font-normal text-ink-subtle">· {t("home.perBook", { price: formatAED(ADDONS.metalCorners.price, locale) })}</span>
            </p>
            <Segmented
              name="b-corners"
              value={state.corners}
              onChange={(v) => update({ corners: v })}
              options={[
                { value: "none", label: t("order.cornersNone") },
                { value: "gold", label: t("colors.gold") },
                { value: "silver", label: t("colors.silver") },
              ]}
            />
          </div>
        </div>
      </Fieldset>
    </>
  );
}

function TextField({
  name,
  value,
  onChange,
  lang,
  optional,
  multiline,
}: {
  name: keyof CoverText;
  value: string;
  onChange: (v: string) => void;
  lang: "en" | "ar";
  optional?: boolean;
  multiline?: boolean;
}) {
  const t = useTranslations("builder");
  const id = useId();
  const cls =
    "mt-1.5 block w-full rounded-lg bg-white px-3 py-2.5 text-base text-navy-950 ring-1 ring-line placeholder:text-ink-subtle/70 focus:ring-2 focus:ring-brand-500 focus:outline-none";
  const common = {
    id,
    value,
    lang,
    dir: lang === "ar" ? ("rtl" as const) : ("ltr" as const),
    placeholder: t(`placeholders.${name}`),
    maxLength: name.startsWith("title") ? 300 : 160,
    autoComplete: "off",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
  };
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-navy-950">
        {t(`fields.${name}`)}
        {optional && <span className="font-normal text-ink-subtle"> ({t("optional")})</span>}
      </label>
      {multiline ? <textarea rows={2} className={cn(cls, "resize-y")} {...common} /> : <input type="text" className={cls} {...common} />}
    </div>
  );
}

function TextStep({
  state,
  update,
  updateText,
}: {
  state: ConfiguratorState;
  update: (p: Partial<ConfiguratorState>) => void;
  updateText: (p: Partial<CoverText>) => void;
}) {
  const t = useTranslations("builder");
  const showEn = state.language !== "ar";
  const showAr = state.language !== "en";
  const fileId = useId();
  const [logoError, setLogoError] = useState(false);

  const onLogo = (file: File | undefined) => {
    setLogoError(false);
    if (!file) return;
    if (!["image/png", "image/jpeg"].includes(file.type) || file.size > MAX_LOGO_BYTES) {
      setLogoError(true);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" && update({ logoDataUrl: reader.result });
    reader.readAsDataURL(file);
  };

  return (
    <>
      <div className="grid gap-6 sm:grid-cols-2">
        <Fieldset legend={t("language")}>
          <Segmented
            name="b-lang"
            value={state.language}
            onChange={(v) => update({ language: v })}
            options={[
              { value: "en", label: t("langEn") },
              { value: "ar", label: t("langAr") },
              { value: "both", label: t("langBoth") },
            ]}
          />
        </Fieldset>
        <Fieldset legend={t("direction")} help={t("directionHelp")}>
          <Segmented
            name="b-dir"
            value={state.direction}
            onChange={(v) => update({ direction: v })}
            options={[
              { value: "auto", label: t("dirAuto") },
              { value: "ltr", label: t("dirLtr") },
              { value: "rtl", label: t("dirRtl") },
            ]}
          />
        </Fieldset>
      </div>

      <div className="space-y-4">
        {showAr && <TextField name="universityAr" lang="ar" value={state.text.universityAr} onChange={(v) => updateText({ universityAr: v })} />}
        {showEn && <TextField name="university" lang="en" value={state.text.university} onChange={(v) => updateText({ university: v })} />}
        <TextField name="college" lang={showEn ? "en" : "ar"} optional value={state.text.college} onChange={(v) => updateText({ college: v })} />
        {showEn && <TextField name="title" lang="en" multiline value={state.text.title} onChange={(v) => updateText({ title: v })} />}
        {showAr && <TextField name="titleAr" lang="ar" multiline value={state.text.titleAr} onChange={(v) => updateText({ titleAr: v })} />}
        {showEn && <TextField name="author" lang="en" value={state.text.author} onChange={(v) => updateText({ author: v })} />}
        {showAr && <TextField name="authorAr" lang="ar" value={state.text.authorAr} onChange={(v) => updateText({ authorAr: v })} />}
        <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
          <TextField name="supervisor" lang={showEn ? "en" : "ar"} optional value={state.text.supervisor} onChange={(v) => updateText({ supervisor: v })} />
          <TextField name="year" lang="en" value={state.text.year} onChange={(v) => updateText({ year: v })} />
        </div>
        <p className="text-sm text-ink-subtle">{t("textHelp")}</p>
      </div>

      <div>
        <p className="text-sm font-semibold text-navy-950">{t("logo")}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {state.logoDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- local data URL preview
            <img src={state.logoDataUrl} alt="" className="size-14 rounded-lg bg-navy-50 object-contain p-1 ring-1 ring-line" />
          )}
          <label htmlFor={fileId} className={buttonClasses("secondary", "sm", "cursor-pointer")}>
            <ImagePlus className="size-4" aria-hidden="true" />
            {t("logoChoose")}
          </label>
          <input
            id={fileId}
            type="file"
            accept="image/png,image/jpeg"
            className="sr-only"
            aria-describedby={`${fileId}-help`}
            onChange={(e) => {
              onLogo(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          {state.logoDataUrl && (
            <Button variant="ghost" size="sm" onClick={() => update({ logoDataUrl: "" })}>
              <X className="size-4" aria-hidden="true" />
              {t("logoRemove")}
            </Button>
          )}
        </div>
        <p id={`${fileId}-help`} className={cn("mt-2 text-sm", logoError ? "text-danger" : "text-ink-subtle")} role={logoError ? "alert" : undefined}>
          {logoError ? t("logoError") : t("logoHelp")}
        </p>
      </div>
    </>
  );
}

function PrintingStep({
  state,
  product,
  update,
}: {
  state: ConfiguratorState;
  product: Product;
  update: (p: Partial<ConfiguratorState>) => void;
}) {
  const t = useTranslations();
  const qtyId = useId();
  const pagesId = useId();
  const p = state.printing;
  const setPrinting = (patch: Partial<ConfiguratorState["printing"]>) => update({ printing: { ...p, ...patch } });
  return (
    <>
      <div>
        <label htmlFor={qtyId} className="text-sm font-semibold text-navy-950">
          {t("order.quantity")}
        </label>
        <div className="mt-3 flex items-center gap-4">
          <Stepper
            id={qtyId}
            value={state.quantity}
            min={product.minQty}
            max={500}
            onChange={(v) => update({ quantity: v })}
            decLabel={t("order.decrease")}
            incLabel={t("order.increase")}
          />
          {product.minQty > 1 && <p className="text-sm text-ink-subtle">{t("order.quantityHelp", { min: product.minQty })}</p>}
        </div>
      </div>
      <Fieldset legend={t("order.printingTitle")}>
        <div className="space-y-5 rounded-xl p-4 ring-1 ring-line">
          <Switch checked={p.enabled} onChange={(v) => setPrinting({ enabled: v })} label={t("order.printingToggle")} description={t("order.printingHelp")} />
          {p.enabled && (
            <>
              <PdfUpload value={p.upload} onChange={(upload) => setPrinting({ upload, ...(upload ? { pages: upload.pages } : {}) })} />
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
                  value={(p.upload?.pages ?? p.pages) || ""}
                  readOnly={!!p.upload}
                  aria-invalid={!p.upload && (p.pages < 1 || p.pages > 2000)}
                  aria-describedby={`${pagesId}-help`}
                  onChange={(e) => setPrinting({ pages: e.target.value === "" ? 0 : Math.floor(Number(e.target.value)) })}
                  className="ltr-value mt-2 block h-11 w-36 rounded-lg bg-white px-3 read-only:bg-navy-50 read-only:text-ink-muted text-base tabular-nums text-navy-950 ring-1 ring-line focus:ring-2 focus:ring-brand-500 focus:outline-none aria-[invalid=true]:ring-danger"
                />
                <p id={`${pagesId}-help`} className="mt-1.5 text-sm text-ink-subtle">
                  {p.upload ? t("builder.upload.pagesLocked") : t("order.pagesHelp")}
                </p>
              </div>
              <div className="flex flex-wrap gap-x-8 gap-y-4">
                <div>
                  <p className="mb-2 text-sm font-medium text-navy-950">{t("order.paper")}</p>
                  <Segmented
                    name="b-paper"
                    value={p.paper}
                    onChange={(v) => setPrinting({ paper: v })}
                    options={[
                      { value: "80gsm", label: t("quote.paper.80gsm") },
                      { value: "120gsm", label: t("quote.paper.120gsm") },
                    ]}
                  />
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium text-navy-950">{t("order.mode")}</p>
                  <Segmented
                    name="b-mode"
                    value={p.mode}
                    onChange={(v) => setPrinting({ mode: v })}
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
    </>
  );
}

function Summary({ state, product }: { state: ConfiguratorState; product: Product }) {
  const t = useTranslations();
  const rows: [string, string][] = [
    [t("builder.productLabel"), t(`products.${product.id}.name`)],
    [t("order.coverColor"), t(`colors.${state.coverColorId}`)],
  ];
  if (state.boxColorId) rows.push([t("order.boxColor"), t(`colors.${state.boxColorId}`)]);
  if (state.foilTone) rows.push([t("order.foil"), t(`colors.${state.foilTone}`)]);
  rows.push([t("builder.language"), t({ en: "builder.langEn", ar: "builder.langAr", both: "builder.langBoth" }[state.language])]);
  for (const k of ["title", "titleAr", "author", "authorAr", "university", "universityAr"] as const) {
    if (state.text[k].trim()) rows.push([t(`builder.fields.${k}`), state.text[k].trim()]);
  }
  return (
    <section aria-labelledby="summary-title">
      <h3 id="summary-title" className="text-sm font-semibold text-navy-950">
        {t("builder.summary")}
      </h3>
      <dl className="mt-3 divide-y divide-line rounded-xl ring-1 ring-line">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[minmax(0,10rem)_1fr] gap-3 px-4 py-2.5 text-sm">
            <dt className="text-ink-subtle">{k}</dt>
            <dd className="min-w-0 break-words font-medium text-navy-950" dir="auto">
              {v}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
