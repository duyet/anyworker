import { cn } from "@/lib/utils"

/**
 * The AnyWorker "AW" mark.
 *
 * Built in the same construction language as the AnyRouter "AR" mark: chevron
 * letterforms with no crossbar, uniform mitred strokes, monochrome, inheriting
 * `currentColor` so it works on all three themes without a second asset. The two
 * products should read as siblings, so the A is deliberately identical in
 * proportion to AnyRouter's and only the second letter changes.
 *
 * Keep this in sync with public/brand/anyworker-logo*.svg.
 */
export function AnyWorkerMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 512 512"
      className={cn("size-6", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth={62}
      strokeLinecap="butt"
      strokeLinejoin="miter"
      role="img"
      aria-label="AnyWorker"
    >
      <path d="M40 432 150 80 260 432" />
      <path d="M286 80 330 432 383 208 436 432 480 80" />
    </svg>
  )
}
