import { cn } from "@/lib/utils";

/**
 * Every page opens the same way: a mono eyebrow saying where you are, the
 * title, and one line on what the page is for. `action` holds the single
 * primary control, if the page has one.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-8 flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="font-mono text-xs tracking-[0.2em] text-acm-300 uppercase">{eyebrow}</p>
        )}
        <h1
          className={cn(
            "font-heading text-3xl font-bold tracking-tight text-balance",
            eyebrow && "mt-2",
          )}
        >
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
