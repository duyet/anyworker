import { ArrowRight, Check, Sparkles } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { HeroStudio } from "@/components/landing/hero-studio"
import { Container, Headline, Lede } from "@/components/landing/primitives"
import { hero } from "@/content/site"

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

        <HeroStudio />
      </Container>
    </section>
  )
}
