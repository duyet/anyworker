import type { ReactNode } from "react"

import type { ThemeId } from "@/content/site"
import { cn } from "@/lib/utils"

/**
 * Applies a design direction to everything it wraps.
 *
 * Why a wrapper and not <html>: the root route's `shellComponent` — the only
 * thing that renders <html> — receives just `children`, with no access to the
 * router, so it cannot know which route is being rendered. Reaching for a router
 * hook there throws (the shell renders outside the router context), so the
 * attribute has to be applied from inside the routed tree.
 *
 * The two things a wrapper would otherwise get wrong — the root scroller's
 * background on overscroll, and `color-scheme` for native scrollbars — are
 * handled by the `html:has([data-theme=…])` rules in styles.css.
 */
export function ThemeScope({
  theme,
  className,
  children,
}: {
  theme: ThemeId
  className?: string
  children: ReactNode
}) {
  return (
    <div
      data-theme={theme}
      className={cn("min-h-svh bg-background text-foreground", className)}
    >
      {children}
    </div>
  )
}
