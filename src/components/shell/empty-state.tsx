import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The empty state is an open slot writ large.
 *
 * Same dashed jasmine outline as `.slot-open`, same meaning: nothing is
 * here yet and a person has to put it there. Thirteen copies of this block
 * used to live across the app, each drifting slightly.
 *
 * `title` names what is missing; `children` says how to fix it.
 */
export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-jasmine/25 bg-white/2 px-6 py-14 text-center",
        className,
      )}
    >
      {Icon && <Icon className="mx-auto size-7 text-jasmine/70" aria-hidden />}
      <p className={cn("font-heading text-lg font-semibold", Icon && "mt-4")}>{title}</p>
      {children && (
        <div className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">{children}</div>
      )}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
