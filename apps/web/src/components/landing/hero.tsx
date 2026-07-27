import { ArrowRight, Check } from "lucide-react"

import { FeatureRelay } from "@/components/landing/feature-relay"
import { Container, Headline, Lede } from "@/components/landing/primitives"
import { Button } from "@/components/ui/button"
import { hero } from "@/content/site"

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <Container className="flex flex-col items-center pt-16 text-center sm:pt-20">
        <p className="text-sm text-muted-foreground">{hero.eyebrow}</p>

        <Headline
          as="h1"
          size="xl"
          lines={hero.headline}
          className="mt-4 max-w-3xl"
        />

        <Lede className="mt-5 max-w-xl">{hero.body}</Lede>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
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

        <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {hero.proofPoints.map((point) => (
            <li
              key={point}
              className="flex items-center gap-1.5 text-sm text-muted-foreground"
            >
              <Check className="size-3.5 text-brand" aria-hidden="true" />
              {point}
            </li>
          ))}
        </ul>
      </Container>

      {/* Full-bleed painted stage + floating product windows */}
      <div className="mt-8 w-full px-3 pb-10 sm:mt-10 sm:px-6 sm:pb-14 lg:px-10">
        <FeatureRelay />
      </div>
    </section>
  )
}
