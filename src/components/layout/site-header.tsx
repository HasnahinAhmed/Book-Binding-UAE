"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ArrowRight, Menu, ShoppingBag, UserRound, X } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { whatsappLink } from "@/config/site";
import { buttonClasses } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/icons/whatsapp";
import { cn } from "@/lib/cn";
import { useCartCount } from "@/lib/cart/count";
import { LanguageSwitch } from "./language-switch";
import { NAV_ITEMS, ORDER_HREF } from "./nav-items";

/**
 * Floating glass navigation. The header row itself is transparent; only the
 * pill carries the glass effect, and it turns more opaque once the page scrolls.
 * Height (pill + top gap) is 4.5rem: sticky elements below use --header-h.
 */
export function SiteHeader() {
  const t = useTranslations();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu on navigation.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  // Escape closes the menu; focus moves into it when it opens and back on close.
  useEffect(() => {
    if (!open) return;
    const toggle = toggleRef.current;
    panelRef.current?.querySelector<HTMLElement>("a,button")?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      toggle?.focus();
    };
  }, [open]);

  const whatsapp = whatsappLink(t("cta.whatsappGreeting"));
  const cartCount = useCartCount();
  const iconBtn =
    "inline-flex size-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-navy-900/5 hover:text-brand-700";

  return (
    <header
      className="pointer-events-none sticky top-0 z-40 px-3 pt-3 sm:px-4"
      style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
    >
      <div
        className={cn(
          "glass pointer-events-auto mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 rounded-full ps-4 pe-2 sm:ps-5",
          "transition-[background-color,box-shadow] duration-300 ease-[var(--ease-out-soft)]",
          (scrolled || open) && "glass-strong",
        )}
      >
        <Link href="/" aria-label={t("a11y.home")} className="flex shrink-0 items-center rounded-full">
          <Image
            src="/images/logo-horizontal-480.webp"
            alt="Book Binding UAE"
            width={480}
            height={206}
            priority
            className="h-8 w-auto"
          />
        </Link>

        <nav aria-label={t("a11y.mainNav")} className="hidden lg:block">
          <ul className="flex items-center gap-0.5">
            {NAV_ITEMS.map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className="rounded-full px-3.5 py-2 text-[0.9375rem] font-medium text-ink/80 transition-colors hover:bg-navy-900/5 hover:text-ink"
                >
                  {t(`nav.${item.key}`)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-1">
          <Suspense fallback={null}>
            <LanguageSwitch className="hidden md:inline-flex" />
          </Suspense>
          <Link href="/account" aria-label={t("nav.account")} className={cn(iconBtn, "max-md:hidden")}>
            <UserRound className="size-5" aria-hidden="true" />
          </Link>
          <Link href="/cart" aria-label={t("cart.count", { count: cartCount })} className={cn(iconBtn, "relative")}>
            <ShoppingBag className="size-5" aria-hidden="true" />
            {cartCount > 0 && (
              <span
                className="absolute -end-0.5 -top-0.5 flex min-w-5 items-center justify-center rounded-full bg-brand-600 px-1 text-[0.6875rem] leading-5 font-semibold text-white"
                aria-hidden="true"
              >
                {cartCount}
              </span>
            )}
          </Link>
          <Link href={ORDER_HREF} className={buttonClasses("primary", "sm", "h-10 px-4 max-[380px]:px-3")}>
            {t("cta.orderOnline")}
          </Link>
          <button
            ref={toggleRef}
            type="button"
            className={cn(iconBtn, "lg:hidden")}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? t("a11y.closeMenu") : t("a11y.menu")}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      <div
        id="mobile-menu"
        ref={panelRef}
        hidden={!open}
        className="glass glass-strong pointer-events-auto absolute inset-x-3 top-full mx-auto mt-2 max-w-6xl overflow-y-auto rounded-3xl sm:inset-x-4 lg:hidden"
        style={{ maxHeight: "calc(100dvh - 6rem)" }}
      >
        <nav aria-label={t("a11y.mainNav")} className="p-3">
          <ul className="flex flex-col">
            {NAV_ITEMS.map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between rounded-2xl px-4 py-3.5 text-lg font-medium text-ink hover:bg-navy-900/5"
                >
                  {t(`nav.${item.key}`)}
                  <ArrowRight className="size-4 text-ink-subtle rtl:rotate-180" aria-hidden="true" />
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/account"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-2xl px-4 py-3.5 text-lg font-medium text-ink hover:bg-navy-900/5"
              >
                <UserRound className="size-5" aria-hidden="true" />
                {t("nav.account")}
              </Link>
            </li>
          </ul>
          <div className="mt-2 flex flex-col gap-2 border-t border-line px-1 pt-3 pb-1">
            <Link href={ORDER_HREF} onClick={() => setOpen(false)} className={buttonClasses("primary", "lg", "w-full")}>
              {t("cta.orderOnline")}
            </Link>
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={buttonClasses("whatsapp", "lg", "w-full")}>
              <WhatsAppIcon className="size-5" />
              {t("cta.whatsapp")}
            </a>
            <Suspense fallback={null}>
              <LanguageSwitch className="flex h-11 justify-center md:hidden" />
            </Suspense>
          </div>
        </nav>
      </div>
    </header>
  );
}
