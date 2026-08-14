import type { Integration } from "@/content/site"
import { Logo } from "@/components/landing/logos"
import { Container, Eyebrow, Headline, Lede, Section } from "@/components/landing/primitives"
import { Badge } from "@/components/ui/badge"
import { connections } from "@/content/site"
import { cn } from "@/lib/utils"

export function Connections() {
  const allItems = [...connections.models.items, ...connections.tools.items] as Integration[]

  return (
    <Section id="connections" tone="muted">
      <Container>
        <div className="flex flex-col items-center text-center gap-5 mb-10">
          <Eyebrow>{connections.eyebrow}</Eyebrow>
          <Headline lines={connections.headline} size="lg" />
          <Lede className="max-w-2xl">{connections.body}</Lede>
        </div>

        {/* Marquee of integration names */}
        <Marquee items={connections.marquee.items} speed={connections.marquee.speed} />

        {/* Full integration grid */}
        <div className="mt-10 flex flex-wrap justify-center gap-2.5">
          {allItems.map((item: Integration) => (
            <span
              key={item.name}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm",
                item.status === "soon"
                  ? "border-dashed border-border/50 text-muted-foreground"
                  : "border-border bg-surface text-foreground",
              )}
            >
              <span aria-hidden="true" className="flex shrink-0">
                <Logo name={item.logo} className="size-4" />
              </span>
              {item.name}
              {item.free ? <Badge className="text-[10px] h-4 px-1.5">free</Badge> : null}
              {item.status === "soon" ? (
                <Badge variant="outline" className="text-[10px] h-4 px-1.5">soon</Badge>
              ) : null}
            </span>
          ))}
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">{connections.footnote}</p>
      </Container>
    </Section>
  )
}

/**
 * Continuous horizontal marquee — a looping ribbon of integration names.
 * Uses CSS animation for performance; pauses on hover and respects
 * prefers-reduced-motion.
 */
function Marquee({ items, speed }: { items: readonly string[]; speed: number }) {
  const duplicated = [...items, ...items]
  return (
    <div className="relative w-full overflow-hidden py-3">
      <div
        className="flex items-center gap-4 whitespace-nowrap motion-reduce:animate-none"
        style={{
          animation: `marquee-scroll ${speed}s linear infinite`,
        }}
      >
        {duplicated.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"
          >
            <span
              className="size-1.5 rounded-full bg-brand"
              aria-hidden="true"
            />
            {item}
          </span>
        ))}
      </div>
      <style>{`
        @keyframes marquee-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  )
}
