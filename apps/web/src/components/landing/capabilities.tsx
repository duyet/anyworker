import type { LucideIcon } from "lucide-react"
import { Eye, Layers, Moon, PackageCheck, Smartphone, Wand } from "lucide-react"

import {
  Container,
  IconBox,
  Section,
  SectionHeader,
} from "@/components/landing/primitives"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { capabilities } from "@/content/site"

const ICONS = {
  PackageCheck,
  Wand,
  Eye,
  Smartphone,
  Moon,
  Layers,
} satisfies Record<string, LucideIcon>

/** Theme radius wins over the shadcn Card's fixed one. Same for every card here. */
const CARD_SHELL =
  "h-full rounded-card [--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(7)]"

export function Capabilities() {
  return (
    <Section>
      <Container className="flex flex-col gap-12 sm:gap-16">
        <SectionHeader
          eyebrow={capabilities.eyebrow}
          lines={capabilities.headline}
          body={capabilities.body}
        />

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {capabilities.items.map((item) => {
            const Icon = ICONS[item.icon]
            return (
              <Card key={item.title} className={CARD_SHELL}>
                <CardHeader className="gap-0">
                  <IconBox>
                    <Icon className="size-5" aria-hidden="true" />
                  </IconBox>
                  <CardTitle className="mt-5">
                    <h3 className="font-display text-lg text-foreground">
                      {item.title}
                    </h3>
                  </CardTitle>
                  <CardDescription className="mt-2 leading-relaxed text-pretty">
                    {item.body}
                  </CardDescription>
                </CardHeader>
              </Card>
            )
          })}
        </div>
      </Container>
    </Section>
  )
}
