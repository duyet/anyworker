import { ArrowRight, Check, Loader, Sparkles } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Container, Headline, Lede } from "@/components/landing/primitives"
import { hero, heroRun } from "@/content/site"
import { cn } from "@/lib/utils"

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border hero-wash">
      <Container className="flex flex-col items-center py-20 text-center sm:py-28">
        <Badge
          variant="outline"
          className="h-7 gap-1.5 px-3 eyebrow text-brand"
        >
          <Sparkles className="size-3" aria-hidden="true" />
          {hero.eyebrow}
        </Badge>

        <Headline
          as="h1"
          size="xl"
          lines={hero.headline}
          className="mt-6 max-w-4xl"
        />

        <Lede className="mt-6 max-w-2xl">{hero.body}</Lede>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Button
            nativeButton={false}
            size="lg"
            className="h-11 px-6"
            render={<a href={hero.primaryCta.href} />}
          >
            {hero.primaryCta.label}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
          <Button
            nativeButton={false}
            size="lg"
            variant="outline"
            className="h-11 px-6"
            render={<a href={hero.secondaryCta.href} />}
          >
            {hero.secondaryCta.label}
          </Button>
        </div>

        <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {hero.proofPoints.map((point) => (
            <li
              key={point}
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <Check className="size-4 text-brand" aria-hidden="true" />
              {point}
            </li>
          ))}
        </ul>

        <TaskRun />
      </Container>
    </section>
  )
}

/**
 * The illustrative task panel.
 *
 * It is deliberately a static, labelled example rather than a fake live feed —
 * animating it would imply a real run is happening. The "waiting" row is the
 * point of the whole component: it shows the product asking before it acts.
 */
function TaskRun() {
  return (
    <div className="mt-14 w-full max-w-2xl text-left">
      <div className="rounded-card border border-border bg-surface shadow-lift">
        <div className="flex items-start gap-3 border-b border-border p-5">
          <Sparkles
            className="mt-0.5 size-4 shrink-0 text-brand"
            aria-hidden="true"
          />
          <p className="text-[0.95rem] font-medium text-pretty text-foreground">
            {heroRun.prompt}
          </p>
        </div>

        <ol className="divide-y divide-border">
          {heroRun.steps.map((step) => {
            const waiting = step.state === "waiting"

            return (
              <li
                key={step.label}
                className="flex items-center gap-3 px-5 py-3.5"
              >
                <StepIcon waiting={waiting} />
                <span
                  className={cn(
                    "w-20 shrink-0 text-sm font-medium",
                    waiting ? "text-brand" : "text-foreground"
                  )}
                >
                  {step.label}
                </span>
                <span className="truncate text-sm text-muted-foreground">
                  {step.detail}
                </span>
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}

function StepIcon({ waiting }: { waiting: boolean }) {
  if (waiting) {
    return (
      <span className="flex size-5 shrink-0 items-center justify-center rounded-pill bg-brand-muted">
        <Loader
          className="size-3 text-brand motion-safe:animate-spin"
          aria-hidden="true"
        />
      </span>
    )
  }

  return (
    <span className="flex size-5 shrink-0 items-center justify-center rounded-pill bg-brand text-brand-foreground">
      <Check className="size-3" aria-hidden="true" />
    </span>
  )
}
