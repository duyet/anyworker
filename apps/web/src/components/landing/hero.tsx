import { ArrowRight, Check } from "lucide-react"

import { UseCaseDemo } from "@/components/landing/skills"
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

      {/* Merged skills: use-case tabs + live app demo replaying running results */}
      <div className="relative mt-8 w-full px-3 pb-10 sm:mt-10 sm:px-6 sm:pb-14 lg:px-10">
        {/* Background image behind the demo app */}
        <div
          className="absolute inset-0 -z-10 overflow-hidden rounded-[0.875rem]"
          aria-hidden="true"
        >
          <img
            src="/brand/stage/peaks.webp"
            alt=""
            className="absolute inset-0 size-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/40 to-background/90" />
        </div>

        <UseCaseDemo />
      </div>
    </section>
  )
}
