import { cn } from "@/lib/utils"
import type { ComponentProps, ReactNode } from "react"

/**
 * Shared building blocks for the landing sections.
 *
 * These are the only place layout rhythm, headline treatment and control
 * styling are defined. Sections compose them; sections do not restyle them.
 * Nothing here names a colour, font or radius — only semantic tokens, so all
 * three design variants get correct output for free.
 */

/* -------------------------------------------------------------------------- */
/* Layout                                                                     */
/* -------------------------------------------------------------------------- */

export function Container({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("mx-auto w-full max-w-6xl px-5 sm:px-8", className)}
      {...props}
    />
  )
}

interface SectionProps extends ComponentProps<"section"> {
  /** Tints the band so adjacent sections separate without a hard rule. */
  tone?: "default" | "muted"
}

export function Section({
  className,
  tone = "default",
  ...props
}: SectionProps) {
  return (
    <section
      className={cn(
        "scroll-mt-20 border-t border-border py-20 sm:py-28",
        tone === "muted" && "bg-surface-muted",
        className
      )}
      {...props}
    />
  )
}

/* -------------------------------------------------------------------------- */
/* Type                                                                       */
/* -------------------------------------------------------------------------- */

export function Eyebrow({ className, ...props }: ComponentProps<"p">) {
  return (
    <p className={cn("text-sm eyebrow text-brand", className)} {...props} />
  )
}

/** A headline line. `accent` paints it in the theme's accent colour. */
export interface HeadlineLine {
  readonly text: string
  readonly accent: boolean
}

interface HeadlineProps {
  lines: readonly HeadlineLine[]
  /** `h1` for the hero, `h2` everywhere else. */
  as?: "h1" | "h2"
  size?: "xl" | "lg" | "md"
  className?: string
  /** Wrap lines instead of forcing a break after each one. */
  inline?: boolean
}

const HEADLINE_SIZES = {
  xl: "text-[2.6rem] sm:text-6xl lg:text-7xl",
  lg: "text-[2.1rem] sm:text-4xl lg:text-5xl",
  md: "text-2xl sm:text-3xl",
} as const

export function Headline({
  lines,
  as: Tag = "h2",
  size = "lg",
  className,
  inline = false,
}: HeadlineProps) {
  return (
    <Tag
      className={cn(
        "font-display text-balance",
        HEADLINE_SIZES[size],
        className
      )}
    >
      {lines.map((line, i) => (
        <span
          key={line.text}
          className={cn(
            inline ? "inline" : "block",
            line.accent ? "text-brand" : "text-foreground"
          )}
        >
          {line.text}
          {inline && i < lines.length - 1 ? " " : null}
        </span>
      ))}
    </Tag>
  )
}

export function Lede({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      className={cn(
        "text-lg leading-relaxed text-pretty text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

/** Eyebrow + headline + lede, with the spacing rhythm every section shares. */
interface SectionHeaderProps {
  eyebrow?: string
  lines: readonly HeadlineLine[]
  body?: string
  align?: "left" | "center"
  size?: "xl" | "lg" | "md"
  className?: string
  children?: ReactNode
}

export function SectionHeader({
  eyebrow,
  lines,
  body,
  align = "left",
  size = "lg",
  className,
  children,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-5",
        align === "center" && "mx-auto max-w-3xl items-center text-center",
        className
      )}
    >
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <Headline lines={lines} size={size} />
      {body ? (
        <Lede className={cn(align === "left" && "max-w-2xl")}>{body}</Lede>
      ) : null}
      {children}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Surfaces                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Small square holder for a section icon.
 *
 * Cards, badges and buttons are NOT defined here on purpose — those come from
 * the generated shadcn components in src/components/ui/. This file holds only
 * layout and typographic helpers, which have no shadcn equivalent.
 */
export function IconBox({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-control bg-brand-muted text-brand",
        className
      )}
      {...props}
    />
  )
}
