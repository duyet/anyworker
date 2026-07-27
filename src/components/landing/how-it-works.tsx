import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react"

import {
  Container,
  Section,
  SectionHeader,
} from "@/components/landing/primitives"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { howItWorks } from "@/content/site"
import { cn } from "@/lib/utils"

const { flow } = howItWorks

/** Placeholder tiles for the connected-tools card. Real logos live elsewhere. */
const TOOL_SLOTS = [0, 1, 2, 3, 4, 5, 6, 7]

/** Theme radius wins over the shadcn Card's fixed one. */
const FLOW_CARD = "rounded-card [--card-spacing:--spacing(5)]"

function FlowArrow() {
  return (
    <ArrowRight
      aria-hidden="true"
      className="size-5 shrink-0 rotate-90 text-subtle-foreground lg:rotate-0"
    />
  )
}

export function HowItWorks() {
  return (
    <Section id="how-it-works" tone="muted">
      <Container className="flex flex-col gap-12 sm:gap-16">
        <SectionHeader
          eyebrow={howItWorks.eyebrow}
          lines={howItWorks.headline}
          body={howItWorks.body}
        />

        <div className="rounded-card border border-border bg-background p-8 sm:p-12">
          <div className="flex flex-col items-center gap-6 lg:flex-row lg:gap-8">
            <div className="flex w-full min-w-0 flex-col gap-3 lg:flex-1">
              <p className="text-xs eyebrow text-subtle-foreground">
                {flow.youAsk}
              </p>
              <Card className={FLOW_CARD}>
                <CardContent className="text-sm leading-relaxed text-pretty text-foreground">
                  {flow.prompt}
                </CardContent>
              </Card>
            </div>

            <FlowArrow />

            <div className="flex w-full min-w-0 flex-col lg:flex-[1.3]">
              <Card
                className={cn(
                  FLOW_CARD,
                  "shadow-lift sm:[--card-spacing:--spacing(6)]"
                )}
              >
                <CardContent>
                  <div className="flex items-center gap-3">
                    <Sparkles
                      aria-hidden="true"
                      className="size-5 shrink-0 text-brand"
                    />
                    <div className="min-w-0">
                      <p className="font-display text-lg text-foreground">
                        {flow.workerName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {flow.workerSub}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-control bg-brand-muted p-4 text-brand">
                    <p className="text-sm font-medium">{flow.modelBadge}</p>
                    <p className="mt-1 font-mono text-xs">{flow.modelSub}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <FlowArrow />

            <div className="flex w-full min-w-0 flex-col gap-3 lg:flex-1">
              <p className="text-xs eyebrow text-subtle-foreground">
                {flow.toolsLabel}
              </p>
              <Card className={FLOW_CARD}>
                <CardContent
                  aria-hidden="true"
                  className="grid grid-cols-4 justify-items-center gap-2.5"
                >
                  {TOOL_SLOTS.map((slot) => (
                    <div
                      key={slot}
                      className="size-9 rounded-control border border-border bg-surface-muted"
                    />
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center gap-2 text-center">
            <Separator orientation="vertical" className="h-8" />
            <p className="text-xs eyebrow text-brand">{flow.outcomeLabel}</p>
            <p className="text-sm text-muted-foreground">{flow.outcomeSub}</p>
            <p className="font-mono text-xs text-subtle-foreground">
              {flow.formats}
            </p>
            <p className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm">
              <ArrowLeft
                aria-hidden="true"
                className="size-4 shrink-0 text-subtle-foreground"
              />
              <span className="font-medium text-foreground">
                {flow.backLabel}
              </span>
              <span className="text-muted-foreground">{flow.backSub}</span>
            </p>
          </div>
        </div>

        <div className="grid gap-8 sm:grid-cols-3 sm:gap-6">
          {howItWorks.steps.map((step, index) => (
            <div key={step.title} className="flex flex-col">
              <span className="flex size-8 items-center justify-center rounded-pill bg-brand text-sm font-medium text-brand-foreground tabular">
                {index + 1}
              </span>
              <h3 className="mt-4 font-display text-lg text-foreground">
                {step.title}
              </h3>
              <p className="mt-2 leading-relaxed text-pretty text-muted-foreground">
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  )
}
