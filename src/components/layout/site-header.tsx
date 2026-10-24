"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Menu, ShoppingBag, UserRound, X } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { whatsappLink } from "@/config/site";
import { buttonClasses } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/icons/whatsapp";
import { cn } from "@/lib/cn";
import { useCartCount } from "@/lib/cart/count";
import { LanguageSwitch } from "./language-switch";
import { NAV_ITEMS } from "./nav-items";

export function SiteHeader() {
  const t = useTranslations();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
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
  const iconBtn = "inline-flex size-10 items-center justify-center rounded-full text-navy-900 hover:bg-navy-50";

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b transition-[background-color,border-color,backdrop-filter] duration-300",
        scrolled || open ? "border-line bg-white/90 backdrop-blur-md" : "border-transparent bg-white/70 backdrop-blur-sm",
      )}
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/" aria-label={t("a11y.home")} className="flex shrink-0 items-center rounded-md">
          <Image
            src="/images/logo-horizontal-480.webp"
            alt="Book Binding UAE"
            width={480}
            height={206}
            priority
            className="h-9 w-auto sm:h-10"
          />
        </Link>

        <nav aria-label={t("a11y.mainNav")} className="hidden md:block">
          <ul className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className="rounded-full px-3.5 py-2 text-[0.9375rem] font-medium text-ink-muted transition-colors hover:bg-navy-50 hover:text-navy-900"
                >
                  {t(`nav.${item.key}`)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-1.5">
          <Suspense fallback={null}>
            <LanguageSwitch className="hidden sm:inline-flex" />
          </Suspense>
          <Link href="/account" aria-label={t("nav.account")} className={cn(iconBtn, "max-sm:hidden")}>
            <UserRound className="size-5" aria-hidden="true" />
          </Link>
          <Link href="/cart" aria-label={t("cart.count", { count: cartCount })} className={cn(iconBtn, "relative")}>
            <ShoppingBag className="size-5" aria-hidden="true" />
            {cartCount > 0 && (
              <span
                className="absolute -end-0.5 -top-0.5 flex min-w-5 items-center justify-center rounded-full bg-brand-500 px-1 text-[0.6875rem] leading-5 font-semibold text-white"
                aria-hidden="true"
              >
                {cartCount}
              </span>
            )}
          </Link>
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("cta.whatsapp")}
            className={buttonClasses("whatsapp", "sm", "max-sm:size-10 max-sm:px-0")}
          >
            <WhatsAppIcon className="size-4" />
            <span className="max-sm:hidden">{t("cta.whatsappShort")}</span>
          </a>
          <button
            ref={toggleRef}
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-full text-navy-900 hover:bg-navy-50 md:hidden"
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
        className="border-t border-line bg-white md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <nav aria-label={t("a11y.mainNav")} className="container-page py-4">
          <ul className="flex flex-col">
            {NAV_ITEMS.map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-3 text-lg font-medium text-navy-900 hover:bg-navy-50"
                >
                  {t(`nav.${item.key}`)}
                </Link>
              </li>
            ))}
            <li className="sm:hidden">
              <Link
                href="/account"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-3 text-lg font-medium text-navy-900 hover:bg-navy-50"
              >
                <UserRound className="size-5" aria-hidden="true" />
                {t("nav.account")}
              </Link>
            </li>
          </ul>
          <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4">
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={buttonClasses("whatsapp", "lg", "w-full")}>
              <WhatsAppIcon className="size-5" />
              {t("cta.whatsapp")}
            </a>
            <Suspense fallback={null}>
              <LanguageSwitch className="h-11 justify-center" />
            </Suspense>
          </div>
        </nav>
      </div>
    </header>
  );
}
