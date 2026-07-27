import type { LucideIcon } from "lucide-react"
import {
  CalendarCheck,
  Megaphone,
  Receipt,
  Scale,
  Siren,
  TrendingUp,
} from "lucide-react"

import {
  Container,
  Eyebrow,
  IconBox,
  Section,
  SectionHeader,
} from "@/components/landing/primitives"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { skills } from "@/content/site"
import { cn } from "@/lib/utils"

const ICONS = {
  Megaphone,
  TrendingUp,
  Scale,
  CalendarCheck,
  Siren,
  Receipt,
} satisfies Record<string, LucideIcon>

/**
 * Field labels for the per-skill metadata rows. These are structural labels,
 * not copy — everything a visitor reads as a claim still comes from site.ts.
 */
const META_LABELS = {
  worksWith: "Works with",
  checksIn: "Checks in",
} as const

/** Theme radius wins over the shadcn Card's fixed one. */
const CARD_SHELL =
  "h-full rounded-card [--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(7)]"

export function Skills() {
  return (
    <Section id="skills">
      <Container className="flex flex-col gap-12 sm:gap-16">
        <SectionHeader
          eyebrow={skills.eyebrow}
          lines={skills.headline}
          body={skills.body}
        />

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {skills.items.map((item) => {
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

                <CardFooter className="mt-auto border-t border-border">
                  <dl className="flex w-full flex-col gap-1.5 text-sm">
                    <div className="flex flex-wrap gap-x-2">
                      <dt className="font-medium text-foreground">
                        {META_LABELS.worksWith}
                      </dt>
                      <dd className="text-muted-foreground">
                        {item.worksWith}
                      </dd>
                    </div>
                    <div className="flex flex-wrap gap-x-2">
                      <dt className="font-medium text-foreground">
                        {META_LABELS.checksIn}
                      </dt>
                      <dd className="text-muted-foreground">{item.checksIn}</dd>
                    </div>
                  </dl>
                </CardFooter>
              </Card>
            )
          })}
        </div>

        <Card className="rounded-card [--card-spacing:--spacing(8)]">
          <CardContent className="grid gap-8 lg:grid-cols-[1fr_2fr]">
            <div className="flex flex-col gap-3">
              <Eyebrow>{skills.trigger.eyebrow}</Eyebrow>
              <h3 className="font-display text-2xl text-foreground">
                {skills.trigger.title}
              </h3>
              <p className="leading-relaxed text-pretty text-muted-foreground">
                {skills.trigger.body}
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-3">
              {skills.trigger.items.map((item) => (
                <div
                  key={item.label}
                  className={cn(
                    "flex flex-col gap-1.5",
                    "sm:border-l sm:border-border sm:pl-6",
                    "sm:first:border-l-0 sm:first:pl-0"
                  )}
                >
                  <p className="text-xs eyebrow text-brand">{item.label}</p>
                  <p className="font-medium text-foreground">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.body}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </Container>
    </Section>
  )
}
