import { useId } from "react";
import { cn } from "@/lib/cn";

export const inputClasses =
  "block h-12 w-full rounded-xl bg-white px-3.5 text-base text-navy-950 ring-1 ring-line placeholder:text-ink-subtle focus:ring-2 focus:ring-brand-500 focus:outline-none aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-danger";

export function TextField({
  label,
  help,
  error,
  className,
  multiline,
  ...props
}: {
  label: string;
  help?: string;
  error?: string | null;
  multiline?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement> &
  React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  const describedBy = [help && `${id}-help`, error && `${id}-err`].filter(Boolean).join(" ") || undefined;
  const common = { id, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy };
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-navy-950">
        {label}
      </label>
      <div className="mt-1.5">
        {multiline ? (
          <textarea {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)} {...common} className={cn(inputClasses, "h-auto min-h-24 py-3")} />
        ) : (
          <input {...(props as React.InputHTMLAttributes<HTMLInputElement>)} {...common} className={inputClasses} />
        )}
      </div>
      {help && (
        <p id={`${id}-help`} className="mt-1.5 text-sm text-ink-subtle">
          {help}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
