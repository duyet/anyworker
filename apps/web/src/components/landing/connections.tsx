import type { Integration } from "@/content/site"
import { Logo } from "@/components/landing/logos"
import { Container, Eyebrow, Headline, Section } from "@/components/landing/primitives"
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
        </div>

        <div className="flex flex-wrap justify-center gap-2.5">
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
