import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * A native `<select>` styled to match `Input`.
 *
 * Deliberately not the Radix `Select`: every one of these sits in a plain form
 * and is read out of `FormData` by name, so going controlled would buy nothing
 * visual and cost real state plumbing.
 *
 * The background MUST be opaque, unlike `Input`'s. `color-scheme: dark` alone
 * is not enough: the browser paints the open option list on its own surface
 * rather than over the page, so a translucent `--surface-1` (4% white) lands on
 * white and the list comes out glaringly pale. `--surface-solid` is the token
 * globals.css already reserves for form fields. The `option` rules are for
 * Firefox, which takes its list colours from the options, not the select.
 */
function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      data-slot="native-select"
      className={cn(
        "h-9 w-full rounded-lg border border-input bg-surface-solid px-3 text-sm transition-colors outline-none hover:bg-surface-solid-2 focus-visible:border-acm-300 focus-visible:ring-3 focus-visible:ring-acm-300/45 disabled:cursor-not-allowed disabled:opacity-50",
        "[&_optgroup]:bg-surface-solid [&_optgroup]:text-muted-foreground [&_option]:bg-surface-solid [&_option]:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export { NativeSelect }
