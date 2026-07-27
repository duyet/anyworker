import {
  Container,
  IconBox,
  Section,
  SectionHeader,
} from "@/components/landing/primitives"
import { Card, CardDescription, CardHeader } from "@/components/ui/card"
import { plugins } from "@/content/site"
import type { LucideIcon } from "lucide-react"
import { Plug, Puzzle, Sparkles, Terminal } from "lucide-react"

/**
 * A reassurance beat: what you already built for Claude carries over. Kept
 * short and two-up so it reads as a footnote to the free-models block above,
 * not as a second headline.
 */

const ICONS = {
  Puzzle,
  Sparkles,
  Plug,
  Terminal,
} satisfies Record<string, LucideIcon>

export function Plugins() {
  return (
    <Section id="plugins" className="py-16 sm:py-24">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1fr]">
          <SectionHeader
            eyebrow={plugins.eyebrow}
            lines={plugins.headline}
            body={plugins.body}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            {plugins.items.map((item) => {
              const Icon = ICONS[item.icon]
              return (
                <Card key={item.title} size="sm" className="p-5">
                  <CardHeader className="flex flex-col items-start gap-4 px-0">
                    <IconBox aria-hidden="true">
                      <Icon className="size-5" />
                    </IconBox>
                    <div className="space-y-1.5">
                      <h3 className="text-base font-medium">{item.title}</h3>
                      <CardDescription>{item.body}</CardDescription>
                    </div>
                  </CardHeader>
                </Card>
              )
            })}
          </div>
        </div>
      </Container>
    </Section>
  )
}
