"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export type NavLink = { href: string; label: string; badge?: React.ReactNode };

/**
 * The active pill slides between links rather than blinking on and off.
 *
 * This is the one place motion earns its keep inside the app: it is feedback
 * about where you just went, not decoration on content. `id` keeps the two
 * navs on an admin page (top bar and section bar) from animating into each
 * other — shared-layout animation matches on `layoutId` alone.
 */
export function AppNav({ links, id }: { links: NavLink[]; id: string }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  return (
    // The scrollbar is hidden but the fade stays: on a phone this row is
    // narrower than its links, and a native scrollbar track under the nav
    // reads as a rendering bug rather than an affordance.
    <nav className="no-scrollbar scroll-fade-x -mx-1 flex items-center gap-1 overflow-x-auto px-1 py-1">
      {links.map((link) => {
        const active =
          pathname === link.href ||
          (link.href !== "/dashboard" && pathname.startsWith(`${link.href}/`));

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative inline-flex shrink-0 items-center rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              active ? "text-acm-100" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {active && (
              <motion.span
                layoutId={`nav-pill-${id}`}
                aria-hidden
                className="absolute inset-0 rounded-lg bg-acm-500/20 ring-1 ring-acm-300/25 ring-inset"
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 420, damping: 34 }
                }
              />
            )}
            <span className="relative">{link.label}</span>
            {link.badge}
          </Link>
        );
      })}
    </nav>
  );
}
