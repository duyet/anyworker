import {
  Container,
  IconBox,
  Section,
  SectionHeader,
} from "@/components/landing/primitives"
import { Card, CardDescription, CardHeader } from "@/components/ui/card"
import { control } from "@/content/site"
import type { LucideIcon } from "lucide-react"
import { Hand, Lock, ScrollText, ShieldCheck } from "lucide-react"

/**
 * The brakes. An agent that sends, publishes and deletes has to say what it
 * will not do without asking, so this section is deliberately plainer and
 * heavier than the rest.
 */

const ICONS = {
  ShieldCheck,
  ScrollText,
  Hand,
  Lock,
} satisfies Record<string, LucideIcon>

export function Control() {
  return (
    <Section tone="muted">
      <Container>
        <SectionHeader
          eyebrow={control.eyebrow}
          lines={control.headline}
          body={control.body}
        />

        <div className="mt-14 grid gap-5 md:grid-cols-2">
          {control.items.map((item) => {
            const Icon = ICONS[item.icon]
            return (
              <Card key={item.title} className="p-7">
                <CardHeader className="flex flex-col items-start gap-5 px-0">
                  <IconBox aria-hidden="true">
                    <Icon className="size-5" />
                  </IconBox>
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">{item.title}</h3>
                    <CardDescription className="text-base leading-relaxed text-pretty">
                      {item.body}
                    </CardDescription>
                  </div>
                </CardHeader>
              </Card>
            )
          })}
        </div>
      </Container>
    </Section>
  )
}
