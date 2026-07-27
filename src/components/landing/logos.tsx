import {
  siAnthropic,
  siAsana,
  siDeepseek,
  siDropbox,
  siGithub,
  siGmail,
  siGooglecalendar,
  siGoogledrive,
  siGooglegemini,
  siHubspot,
  siJira,
  siKimi,
  siLinear,
  siMinimax,
  siMistralai,
  siNotion,
  siOllama,
  siQwen,
} from "simple-icons"

import { cn } from "@/lib/utils"
import type { ReactElement } from "react"

/**
 * Brand marks for the entries in `connections`, keyed by their `logo` field.
 *
 * Paths come from `simple-icons` (CC0 icon data) rather than being drawn by
 * hand — hand-copied brand geometry is reliably slightly wrong, which is worse
 * than having no mark at all.
 *
 * Every mark renders in `currentColor`, never its official brand colour. This
 * page ships three themes and `studio` is near-black; a fixed brand hex is
 * illegible on at least one of them. Monochrome is the correct trade.
 */

interface LogoProps {
  name: string
  className?: string
}

/** Only the field we read. `simple-icons` also carries title, hex and slug. */
interface IconPath {
  readonly path: string
}

/**
 * Names absent from this map fall back to a lettermark. As of simple-icons 16
 * that is openai, slack, outlook, xai and zai — those brands are not in the
 * set, and substituting a lookalike (X for xAI, say) would be a wrong mark.
 */
// `| undefined` is load-bearing: `name` is an arbitrary string from site.ts, so
// a miss is possible and the fallback branch below has to stay reachable.
const ICONS: Record<string, IconPath | undefined> = {
  anthropic: siAnthropic,
  gemini: siGooglegemini,
  deepseek: siDeepseek,
  qwen: siQwen,
  kimi: siKimi,
  minimax: siMinimax,
  mistral: siMistralai,
  ollama: siOllama,
  gmail: siGmail,
  gcal: siGooglecalendar,
  gdrive: siGoogledrive,
  notion: siNotion,
  github: siGithub,
  linear: siLinear,
  jira: siJira,
  hubspot: siHubspot,
  dropbox: siDropbox,
  asana: siAsana,
}

/**
 * The real AnyRouter "AR" mark, copied from that project's own
 * public/brand/anyrouter-logo-currentcolor.svg rather than approximated. It
 * carries its own viewBox and flip transform, so it is rendered as a whole SVG
 * instead of a path dropped into the shared 24x24 frame.
 */
function AnyRouterMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="203.66 206.57 801.34 801.34"
      className={cn("size-5", className)}
      fill="currentColor"
      aria-hidden="true"
    >
      <g transform="translate(0,1254) scale(0.1,-0.1)">
        <path d="M5208 9108 c-102 -165 -346 -575 -781 -1313 -671 -1138 -1030 -1742 -1457 -2455 -320 -533 -914 -1530 -928 -1556 -11 -21 -9 -22 41 -26 28 -3 111 -4 182 -3 72 0 279 2 460 3 l330 2 86 143 c80 131 240 395 754 1237 191 314 496 820 1053 1745 145 242 275 461 288 488 13 26 28 47 33 47 10 0 286 -441 973 -1550 233 -377 624 -1006 868 -1397 l445 -712 543 -3 c298 -2 542 -2 542 0 0 2 -93 150 -206 330 -325 515 -1256 2003 -1484 2372 -114 184 -319 517 -457 740 -557 902 -1209 1948 -1228 1968 -10 11 -21 -1 -57 -60z" />
        <path d="M5600 9175 c0 -3 22 -40 48 -83 64 -101 327 -522 428 -684 l79 -127 970 -3 970 -3 73 -23 c258 -79 443 -233 566 -471 67 -129 97 -253 97 -401 0 -128 -8 -184 -46 -297 -92 -276 -338 -507 -622 -585 -72 -19 -108 -21 -480 -25 -222 -3 -403 -7 -403 -9 0 -2 50 -84 112 -182 128 -205 258 -410 513 -817 100 -159 250 -398 334 -530 83 -132 283 -450 443 -707 l293 -467 538 -1 c295 0 537 2 537 5 0 2 -52 89 -116 192 -64 103 -129 208 -144 233 -23 38 -318 510 -877 1402 -67 108 -123 201 -123 205 1 4 37 30 81 56 182 110 396 310 528 495 140 197 250 446 301 687 31 142 39 438 16 590 -61 405 -251 768 -554 1056 -135 129 -260 215 -437 304 -220 109 -400 162 -634 185 -105 10 -2491 15 -2491 5z" />
      </g>
    </svg>
  )
}

/**
 * No accurate mark available. A lettermark is honest — it does not pretend to
 * be an official logo the way a hand-approximated one would.
 */
const FALLBACK = ({ name, className }: LogoProps): ReactElement => (
  <span
    aria-hidden="true"
    className={cn(
      "inline-flex size-5 items-center justify-center rounded-control border border-border bg-surface-muted text-[0.625rem] font-medium text-subtle-foreground",
      className
    )}
  >
    {name.slice(0, 1).toUpperCase()}
  </span>
)

/**
 * Decorative by design: the integration name is always rendered as text next
 * to the mark, so the SVG is `aria-hidden` and adds no duplicate label.
 */
export function Logo({ name, className }: LogoProps): ReactElement {
  if (name === "anyrouter") {
    return <AnyRouterMark className={className} />
  }

  const icon = ICONS[name]

  if (!icon) {
    return <FALLBACK name={name} className={className} />
  }

  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("size-5", className)}
      aria-hidden="true"
    >
      <path d={icon.path} fill="currentColor" />
    </svg>
  )
}
