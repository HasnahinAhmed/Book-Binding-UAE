"use client";

import { useId } from "react";
import { Check, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/cn";

export function Fieldset({ legend, help, children, className }: { legend: string; help?: string; children: React.ReactNode; className?: string }) {
  const helpId = useId();
  return (
    <fieldset className={cn("min-w-0", className)} aria-describedby={help ? helpId : undefined}>
      <legend className="text-sm font-semibold text-navy-950">{legend}</legend>
      <div className="mt-3">{children}</div>
      {help && (
        <p id={helpId} className="mt-2 text-sm text-ink-subtle">
          {help}
        </p>
      )}
    </fieldset>
  );
}

/** Colour swatches as a native radio group (keyboard + screen-reader friendly). */
export function SwatchGroup({
  name,
  value,
  onChange,
  options,
}: {
  name: string;
  value: string;
  onChange: (v: string) => void;
  options: { id: string; hex: string; label: string; texture?: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {options.map((o) => (
        <label key={o.id} className="group relative flex cursor-pointer flex-col items-center gap-1.5">
          <input
            type="radio"
            name={name}
            value={o.id}
            checked={value === o.id}
            onChange={() => onChange(o.id)}
            className="peer sr-only"
          />
          <span
            className="flex size-11 items-center justify-center rounded-full ring-1 ring-black/10 ring-offset-2 transition-shadow peer-checked:ring-2 peer-checked:ring-brand-600 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-brand-500"
            style={{
              background:
                o.texture === "croc"
                  ? `repeating-linear-gradient(45deg, ${o.hex}, ${o.hex} 4px, #a67a25 4px, #a67a25 6px)`
                  : o.texture === "leather"
                    ? `radial-gradient(circle at 30% 30%, color-mix(in srgb, ${o.hex} 70%, white), ${o.hex} 60%)`
                    : o.hex,
            }}
          >
            {value === o.id && <Check className="size-4 text-white drop-shadow" aria-hidden="true" />}
          </span>
          <span className="text-xs font-medium text-ink-muted peer-checked:text-navy-950">{o.label}</span>
        </label>
      ))}
    </div>
  );
}

/** Segmented choice built on native radios. */
export function Segmented<V extends string>({
  name,
  value,
  onChange,
  options,
}: {
  name: string;
  value: V;
  onChange: (v: V) => void;
  options: { value: V; label: string }[];
}) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-full bg-navy-50 p-1">
      {options.map((o) => (
        <label key={o.value} className="relative">
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
            className="peer sr-only"
          />
          <span className="flex h-9 cursor-pointer items-center rounded-full px-4 text-sm font-medium text-ink-muted transition-colors peer-checked:bg-white peer-checked:text-navy-950 peer-checked:shadow-sm peer-focus-visible:outline-2 peer-focus-visible:outline-brand-500">
            {o.label}
          </span>
        </label>
      ))}
    </div>
  );
}

export function Stepper({
  id,
  value,
  min,
  max,
  onChange,
  decLabel,
  incLabel,
  describedBy,
  ariaLabel,
}: {
  id: string;
  ariaLabel?: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  decLabel: string;
  incLabel: string;
  describedBy?: string;
}) {
  const clamp = (n: number) => Math.max(min, Math.min(max, Math.round(n)));
  const btn =
    "flex size-11 items-center justify-center rounded-full text-navy-900 hover:bg-navy-50 disabled:opacity-40 disabled:hover:bg-transparent";
  return (
    <div className="inline-flex items-center gap-1 rounded-full ring-1 ring-line">
      <button type="button" className={btn} aria-label={decLabel} disabled={value <= min} onClick={() => onChange(clamp(value - 1))}>
        <Minus className="size-4" aria-hidden="true" />
      </button>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        aria-describedby={describedBy}
        aria-label={ariaLabel}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n) && e.target.value !== "") onChange(clamp(n));
        }}
        className="ltr-value w-14 bg-transparent text-center text-base font-semibold tabular-nums text-navy-950 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button type="button" className={btn} aria-label={incLabel} disabled={value >= max} onClick={() => onChange(clamp(value + 1))}>
        <Plus className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <label htmlFor={id} className="cursor-pointer font-medium text-navy-950">
          {label}
        </label>
        {description && <p className="mt-0.5 text-sm text-ink-subtle">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors",
          checked ? "bg-brand-600" : "bg-navy-200",
        )}
      >
        <span
          className={cn(
            "inline-block size-5 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-6 rtl:-translate-x-6" : "translate-x-1 rtl:-translate-x-1",
          )}
        />
      </button>
    </div>
  );
}
