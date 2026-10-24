"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CircleCheck, ShoppingBag } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { CartItemInput } from "@/lib/cart/schema";
import { cart } from "@/lib/cart/store";
import { Button } from "@/components/ui/button";

export function AddToCart({ item, disabled }: { item: Omit<CartItemInput, "id" | "addedAt"> | null; disabled?: boolean }) {
  const t = useTranslations("cart");
  const [status, setStatus] = useState<"idle" | "added" | "full">("idle");
  return (
    <div className="space-y-2">
      <Button
        type="button"
        size="lg"
        className="w-full"
        disabled={disabled || !item}
        onClick={() => item && setStatus(cart.add(item) ? "added" : "full")}
      >
        <ShoppingBag className="size-5" aria-hidden="true" />
        {t("addToCart")}
      </Button>
      <p aria-live="polite" className="min-h-5 text-sm">
        {status === "added" && (
          <span className="flex items-center gap-1.5 text-success">
            <CircleCheck className="size-4" aria-hidden="true" />
            {t("added")}{" "}
            <Link href="/cart" className="font-medium text-brand-700 underline underline-offset-4">
              {t("viewCart")}
            </Link>
          </span>
        )}
        {status === "full" && <span className="text-danger">{t("full")}</span>}
      </p>
    </div>
  );
}
