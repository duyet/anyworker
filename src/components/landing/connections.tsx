import { Logo } from "@/components/landing/logos"
import {
  Container,
  Section,
  SectionHeader,
} from "@/components/landing/primitives"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { connections } from "@/content/site"
import { cn } from "@/lib/utils"

/**
 * Model providers and everyday tools, as two labelled rows of logo pills.
 *
 * `status: "soon"` items are dimmed and badged rather than hidden — the
 * honesty constraint in CLAUDE.md requires unbuilt integrations to read as
 * unbuilt.
 */

interface Pill {
  readonly name: string
  readonly logo: string
  readonly status: string
  readonly free?: boolean
}

interface RowProps {
  label: string
  sub: string
  items: readonly Pill[]
}

function Row({ label, sub, items }: RowProps) {
  return (
    <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
      <div>
        <p className="font-medium text-foreground">{label}</p>
        <p className="mt-1 text-sm text-muted-foreground">{sub}</p>
      </div>
      <ul className="flex flex-wrap gap-3">
        {items.map((item) => (
          <li key={item.name}>
            <span
              className={cn(
                "inline-flex items-center gap-2.5 rounded-control border border-border bg-surface px-4 py-3 text-sm font-medium",
                item.status === "soon" && "opacity-60"
              )}
            >
              <span aria-hidden="true" className="flex shrink-0">
                <Logo name={item.logo} className="size-5" />
              </span>
              {item.name}
              {item.free ? <Badge>free</Badge> : null}
              {item.status === "soon" ? (
                <Badge variant="outline">soon</Badge>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Connections() {
  return (
    <Section id="connections">
      <Container>
        <SectionHeader
          align="center"
          eyebrow={connections.eyebrow}
          lines={connections.headline}
          body={connections.body}
        />

        <div className="mt-14 sm:mt-16">
          <Row
            label={connections.models.label}
            sub={connections.models.sub}
            items={connections.models.items}
          />

          <Separator className="my-10" />

          <Row
            label={connections.tools.label}
            sub={connections.tools.sub}
            items={connections.tools.items}
          />

          <p className="mt-10 text-sm text-subtle-foreground">
            {connections.footnote}
          </p>
        </div>
      </Container>
    </Section>
  )
}
