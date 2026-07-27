import {
  Container,
  IconBox,
  Section,
  SectionHeader,
} from "@/components/landing/primitives"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { anyrouter } from "@/content/site"
import type { LucideIcon } from "lucide-react"
import { ArrowUpRight, CreditCard, HardDrive, Repeat } from "lucide-react"

/**
 * The free-models block — the one claim no competitor on this page can make,
 * so it gets the loudest surface: a full-width washed panel with more air than
 * the grids either side of it.
 */

const ICONS = {
  CreditCard,
  Repeat,
  HardDrive,
} satisfies Record<string, LucideIcon>

export function AnyRouter() {
  return (
    <Section id="free-models" tone="muted" className="py-24 sm:py-32">
      <Container>
        <Card className="gap-0 hero-wash p-8 sm:p-14">
          <CardHeader className="px-0">
            <SectionHeader
              eyebrow={anyrouter.eyebrow}
              lines={anyrouter.headline}
              body={anyrouter.body}
              size="lg"
            />
          </CardHeader>

          <CardContent className="mt-12 grid gap-10 px-0 sm:mt-16 md:grid-cols-3 md:gap-8">
            {anyrouter.points.map((point) => {
              const Icon = ICONS[point.icon]
              return (
                <div key={point.title}>
                  <IconBox aria-hidden="true">
                    <Icon className="size-5" />
                  </IconBox>
                  <h3 className="mt-5 text-lg font-medium text-foreground">
                    {point.title}
                  </h3>
                  <p className="mt-2 text-base leading-relaxed text-pretty text-muted-foreground">
                    {point.body}
                  </p>
                </div>
              )
            })}
          </CardContent>

          <CardFooter className="mt-12 px-0 sm:mt-14">
            <Button
              nativeButton={false}
              size="lg"
              className="h-11 px-6"
              render={
                <a href={anyrouter.cta.href} target="_blank" rel="noreferrer" />
              }
            >
              {anyrouter.cta.label}
              <ArrowUpRight aria-hidden="true" />
            </Button>
          </CardFooter>
        </Card>
      </Container>
    </Section>
  )
}
