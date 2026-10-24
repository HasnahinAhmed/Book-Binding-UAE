import { cn } from "@/lib/cn";

const tones = {
  neutral: "bg-navy-50 text-navy-700 ring-navy-100",
  brand: "bg-brand-50 text-brand-800 ring-brand-100",
  warning: "bg-warning-bg text-warning ring-amber-200",
  success: "bg-success-bg text-success ring-green-200",
} as const;

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof tones }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset", tones[tone], className)}
      {...props}
    />
  );
}
