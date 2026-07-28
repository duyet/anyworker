import { cn } from "@/lib/utils"

/**
 * The AnyWorker brand mark — "A/" monogram.
 *
 * The A is a clean geometric letterform (7-unit legs, 4-unit crossbar). The
 * slash branches from the right leg's outer edge near the top and runs parallel
 * to it (same slope), like a splinter off the stroke.
 *
 * Right-leg outer edge: (21,4)→(27,28), dx/dy = 6/24 = 1/4.
 * At y=8 (4 below apex) the edge x = 21 + 4/4 = 22.
 * Slash starts at (22,8) and follows the same diagonal.
 */

export function AnyWorkerMark({
  className,
  colored,
}: {
  className?: string
  colored?: boolean
}) {
  const c = colored ? "#c8f542" : "currentColor"
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("size-6", className)}
      fill="none"
      role="img"
      aria-label="AnyWorker"
    >
      {/* A — left leg, right leg, crossbar */}
      <path
        d="M7 28 L13 4 L21 4 L27 28 L23 28 L21 22 L13 22 L11 28 Z"
        fill={c}
      />
      {/* A crossbar */}
      <path d="M14 18 L20 18 L19 14 L15 14 Z" fill={c} />
      {/* Slash — parallel to right leg, branching from outer edge at y=8 */}
      <polygon points="22,8 22.7,8 24.7,16 24,16" fill={c} />
    </svg>
  )
}

/**
 * Full logotype: icon mark + "AnyWorker" wordmark.
 */
export function AnyWorkerLogo({
  className,
  colored,
  size = "sm",
}: {
  className?: string
  colored?: boolean
  size?: "sm" | "md" | "lg"
}) {
  const iconSize = size === "lg" ? "size-8" : size === "md" ? "size-7" : "size-5"
  const textSize =
    size === "lg" ? "text-lg" : size === "md" ? "text-base" : "text-sm"
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <AnyWorkerMark className={iconSize} colored={colored} />
      <span
        className={cn(
          "font-semibold tracking-tight",
          textSize,
          colored ? "text-brand" : "text-foreground",
        )}
      >
        AnyWorker
      </span>
    </span>
  )
}
