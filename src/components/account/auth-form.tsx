"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { whatsappLink } from "@/config/site";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";

type Mode = "sign-in" | "sign-up";

function errorKey(err: { status?: number; code?: string } | null): string {
  if (!err) return "generic";
  if (err.status === 429) return "rate";
  const code = err.code ?? "";
  if (code.includes("INVALID_EMAIL_OR_PASSWORD") || err.status === 401) return "invalid";
  if (code.includes("ALREADY_EXISTS")) return "exists";
  if (code.includes("PASSWORD_TOO_SHORT")) return "weak";
  return "generic";
}

export function AuthForm({ mode, next }: { mode: Mode; next: string }) {
  const t = useTranslations("auth");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const name = String(form.get("name") ?? "").trim();
    if (mode === "sign-up" && password.length < 10) return setError("weak");
    setBusy(true);
    setError(null);
    const res =
      mode === "sign-in"
        ? await authClient.signIn.email({ email, password })
        : await authClient.signUp.email({ email, password, name });
    if (res.error) {
      setBusy(false);
      setError(errorKey(res.error));
      return;
    }
    router.replace(next);
    router.refresh();
  };

  const other = mode === "sign-in" ? "/account/sign-up" : "/account/sign-in";
  const nextQuery = next !== "/account" ? `?next=${encodeURIComponent(next)}` : "";

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate={false}>
      {mode === "sign-up" && <TextField label={t("name")} name="name" autoComplete="name" required minLength={2} maxLength={100} />}
      <TextField label={t("email")} name="email" type="email" autoComplete="email" required inputMode="email" dir="ltr" />
      <TextField
        label={t("password")}
        name="password"
        type="password"
        autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
        required
        minLength={mode === "sign-up" ? 10 : undefined}
        maxLength={128}
        help={mode === "sign-up" ? t("passwordHelp") : undefined}
        dir="ltr"
      />
      {error && (
        <p role="alert" className="rounded-xl bg-danger-bg px-4 py-3 text-sm text-danger">
          {t(`errors.${error}`)}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={busy}>
        {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
        {busy ? t("working") : mode === "sign-in" ? t("signIn") : t("signUp")}
      </Button>
      <p className="text-center text-sm text-ink-muted">
        {mode === "sign-in" ? t("noAccount") : t("haveAccount")}{" "}
        <Link href={`${other}${nextQuery}`} className="font-medium text-brand-700 underline-offset-4 hover:underline">
          {mode === "sign-in" ? t("createOne") : t("signInLink")}
        </Link>
      </p>
      {mode === "sign-in" && (
        <p className="text-center text-sm text-ink-subtle">
          <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">
            {t("forgot")}
          </a>
        </p>
      )}
    </form>
  );
}
