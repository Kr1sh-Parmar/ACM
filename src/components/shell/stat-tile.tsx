import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A single number worth acting on.
 *
 * The value is mono and tabular so a queue that ticks from 9 to 10 does not
 * shift the layout. `attention` warms the tile to jasmine — used when the
 * number is a backlog rather than a fact, so "3 waiting" looks different
 * from "38 members".
 */
export function StatTile({
  href,
  label,
  value,
  hint,
  icon: Icon,
  attention = false,
}: {
  href?: string;
  label: string;
  value: number | string;
  hint?: string;
  icon?: LucideIcon;
  attention?: boolean;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="font-mono text-xs tracking-[0.16em] text-muted-foreground uppercase">
          {label}
        </p>
        {Icon && (
          <Icon
            className={cn("size-4 shrink-0", attention ? "text-jasmine" : "text-acm-300/70")}
            aria-hidden
          />
        )}
      </div>
      <p
        className={cn(
          "mt-3 font-mono text-4xl leading-none font-medium",
          attention ? "text-jasmine" : "text-foreground",
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
    </>
  );

  const className = cn(
    "glass rim block rounded-2xl p-5 shadow-glow-md transition-colors",
    href && "hover:bg-surface-2",
  );

  // Jasmine rim when the tile is a backlog, brand blue otherwise.
  const style = attention ? ({ "--rim-hue": "45deg" } as React.CSSProperties) : undefined;

  return href ? (
    <Link href={href} className={className} style={style}>
      {body}
    </Link>
  ) : (
    <div className={className} style={style}>
      {body}
    </div>
  );
}
