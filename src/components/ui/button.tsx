import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "whatsapp" | "brand";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap select-none " +
  "transition-[background-color,color,box-shadow,transform] duration-200 ease-[var(--ease-out-soft)] " +
  "motion-safe:hover:-translate-y-px active:translate-y-0 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500";

const variants: Record<ButtonVariant, string> = {
  // Primary: blue with white text. One per view.
  primary:
    "bg-brand-600 text-white shadow-[0_1px_2px_rgb(2_120_176/0.25),0_8px_20px_-8px_rgb(2_120_176/0.55)] hover:bg-brand-700 hover:shadow-[0_2px_4px_rgb(2_120_176/0.25),0_12px_28px_-10px_rgb(2_120_176/0.6)]",
  brand:
    "bg-brand-600 text-white shadow-[0_1px_2px_rgb(2_120_176/0.25),0_8px_20px_-8px_rgb(2_120_176/0.55)] hover:bg-brand-700",
  // Secondary: white glass with a hairline border.
  secondary:
    "bg-white/75 text-ink ring-1 ring-inset ring-navy-200/70 backdrop-blur-md hover:bg-white hover:ring-brand-300 hover:text-brand-700",
  ghost: "text-ink hover:bg-navy-50",
  // WhatsApp stays in the secondary style so blue remains the only action colour.
  whatsapp:
    "bg-white/75 text-ink ring-1 ring-inset ring-navy-200/70 backdrop-blur-md hover:bg-white hover:ring-[#0F7A40]/40 [&_svg]:text-[#0F7A40]",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-[0.9375rem]",
  lg: "h-13 px-7 text-base",
};

/** Class names for button-styled elements (buttons and links share one look). */
export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button type={type} className={buttonClasses(variant, size, className)} {...props} />;
}
