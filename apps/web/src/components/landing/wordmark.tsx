import { cn } from "@/lib/utils"

/**
 * The AnyWorker "A/" mark.
 *
 * Sibling to the AnyRouter "AR" mark: the same A, verbatim, followed by a
 * slash built on the A's own left-leg slope and stroke width, so both
 * diagonals match by construction.
 *
 * Square viewBox so it drops into the square icon slots callers already use.
 * Keep this in sync with public/brand/anyworker-logo*.svg.
 */
export function AnyWorkerMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="114.58 -38.14 1291.67 1291.67"
      className={cn("size-6", className)}
      fill="currentColor"
      role="img"
      aria-label="AnyWorker"
    >
      <g transform="translate(0,1254) scale(0.1,-0.1)">
        <path d="M5208 9108 c-102 -165 -346 -575 -781 -1313 -671 -1138 -1030 -1742 -1457 -2455 -320 -533 -914 -1530 -928 -1556 -11 -21 -9 -22 41 -26 28 -3 111 -4 182 -3 72 0 279 2 460 3 l330 2 86 143 c80 131 240 395 754 1237 191 314 496 820 1053 1745 145 242 275 461 288 488 13 26 28 47 33 47 10 0 286 -441 973 -1550 233 -377 624 -1006 868 -1397 l445 -712 543 -3 c298 -2 542 -2 542 0 0 2 -93 150 -206 330 -325 515 -1256 2003 -1484 2372 -114 184 -319 517 -457 740 -557 902 -1209 1948 -1228 1968 -10 11 -21 -1 -57 -60z" />
        <path d="M8890.0 3754.6L9935.0 3754.6L13171.7 9171.6L12126.7 9171.6Z" />
      </g>
    </svg>
  )
}
