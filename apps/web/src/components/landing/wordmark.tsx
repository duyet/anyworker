import { cn } from "@/lib/utils"

/**
 * The AnyWorker "AW" mark.
 *
 * Sibling to the AnyRouter "AR" mark: heavy filled monogram letterforms,
 * monochrome, inheriting `currentColor` so it works on all themes.
 *
 * Keep this in sync with public/brand/anyworker-logo*.svg.
 */
export function AnyWorkerMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 512 512"
      className={cn("size-6", className)}
      fill="currentColor"
      role="img"
      aria-label="AnyWorker"
    >
      <path d="M148 40 12 472h92l40-136 40 136h92L148 40z" />
      <path d="M292 40h70l32 236 32-236h70l-58 432h-72l-32-220-32 220h-72L292 40z" />
    </svg>
  )
}
