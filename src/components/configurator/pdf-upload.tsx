"use client";

import { FileText, Loader2, Upload, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useRef, useState } from "react";
import type { UploadedPdf } from "@/lib/configurator/state";
import { PUBLIC_UPLOAD_MAX_MB } from "@/lib/uploads/limits";
import { demoInspectPdf } from "@/components/demo/demo-api";

const KNOWN_ERRORS = ["not_pdf", "encrypted", "unreadable", "no_pages", "too_many_pages", "too_large", "rate_limited"] as const;

function errorKey(code: string): string {
  return (KNOWN_ERRORS as readonly string[]).includes(code) ? code : "generic";
}

export function PdfUpload({ value, onChange }: { value: UploadedPdf | null; onChange: (v: UploadedPdf | null) => void }) {
  const t = useTranslations("builder.upload");
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = (file: File) => {
    setError(null);
    const looksPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!looksPdf) return setError("not_pdf");
    if (file.size > PUBLIC_UPLOAD_MAX_MB * 1024 * 1024) return setError("too_large");

    // Preview build: read the page count in the browser; nothing is uploaded.
    setProgress(0);
    void demoInspectPdf(file).then(
      (r) => {
        setProgress(null);
        if (r.ok) onChange(r.upload as UploadedPdf);
        else setError(errorKey(r.code));
      },
      () => {
        setProgress(null);
        setError("generic");
      },
    );
    return;
    const form = new FormData();
    form.append("file", file);
    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    xhr.open("POST", "/api/uploads");
    xhr.responseType = "json";
    xhr.upload.onprogress = (e) => e.lengthComputable && setProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      setProgress(null);
      const body = xhr.response as { ok?: boolean; upload?: UploadedPdf; error?: { code?: string } } | null;
      if (xhr.status === 201 && body?.ok && body.upload) onChange(body.upload);
      else setError(errorKey(body?.error?.code ?? ""));
    };
    xhr.onerror = () => {
      setProgress(null);
      setError("generic");
    };
    xhr.onabort = () => setProgress(null);
    setProgress(0);
    xhr.send(form);
  };

  const remove = () => {
    if (value) void fetch(`/api/uploads/${encodeURIComponent(value.id)}`, { method: "DELETE" }).catch(() => {});
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const busy = progress !== null;

  return (
    <div className="space-y-2">
      <p className="font-medium text-navy-950">{t("title")}</p>
      <p id={`${inputId}-help`} className="text-sm text-ink-subtle">
        {t("help", { max: PUBLIC_UPLOAD_MAX_MB })}
      </p>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        aria-describedby={`${inputId}-help`}
        disabled={busy}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
        }}
      />
      {value && !busy ? (
        <div className="flex items-center gap-3 rounded-xl bg-brand-50 p-3 ring-1 ring-brand-200">
          <FileText className="size-5 shrink-0 text-brand-700" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-navy-950" dir="auto">
              {value.name}
            </p>
            <p className="text-sm text-ink-muted">{t("done", { pages: value.pages })}</p>
          </div>
          <label htmlFor={inputId} className="cursor-pointer rounded-lg px-2.5 py-1.5 text-sm font-medium text-brand-800 hover:bg-brand-100">
            {t("replace")}
          </label>
          <button
            type="button"
            onClick={remove}
            className="rounded-lg p-1.5 text-ink-muted hover:bg-brand-100 hover:text-navy-950"
            aria-label={t("remove")}
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      ) : busy ? (
        <div className="flex min-h-14 items-center justify-center gap-2 rounded-xl border border-dashed border-navy-200 px-4 py-3 text-sm font-medium text-navy-900">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          <span aria-live="polite">{t("uploading", { pct: progress })}</span>
          <button type="button" onClick={() => xhrRef.current?.abort()} className="ms-2 text-ink-muted underline hover:text-navy-950">
            {t("cancel")}
          </button>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          className="flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-navy-200 px-4 py-3 text-sm font-medium text-navy-900 transition-colors hover:border-brand-400 hover:bg-brand-50 has-[:focus-visible]:ring-2"
        >
          <Upload className="size-4" aria-hidden="true" />
          {t("choose")}
        </label>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {t(`errors.${error}`, { max: PUBLIC_UPLOAD_MAX_MB })}
        </p>
      )}
    </div>
  );
}
