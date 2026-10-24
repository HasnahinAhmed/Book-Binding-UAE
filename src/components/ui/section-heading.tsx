import { cn } from "@/lib/cn";

export function SectionHeading({
  eyebrow,
  title,
  lead,
  align = "start",
  id,
  className,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  align?: "start" | "center";
  id?: string;
  className?: string;
}) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center", className)} data-reveal>
      {eyebrow && <p className="text-sm font-semibold text-brand-700">{eyebrow}</p>}
      <h2 id={id} className="mt-2 text-h2 font-semibold text-navy-950 text-balance">
        {title}
      </h2>
      {lead && <p className="mt-4 text-lg leading-relaxed text-ink-muted text-pretty">{lead}</p>}
    </div>
  );
}
