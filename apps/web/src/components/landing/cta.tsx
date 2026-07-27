import { finalCta } from "@/content/site"
import {
  Container,
  Headline,
  Lede,
  Section,
} from "@/components/landing/primitives"
import { Button } from "@/components/ui/button"

export function FinalCta() {
  return (
    <Section id="get-started">
      <Container>
        <div className="rounded-card border border-border hero-wash p-10 text-center sm:p-16">
          <Headline lines={finalCta.headline} size="lg" />
          <Lede className="mx-auto mt-5 max-w-xl">{finalCta.body}</Lede>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button
              nativeButton={false}
              variant="default"
              size="lg"
              render={<a href={finalCta.primaryCta.href} />}
            >
              {finalCta.primaryCta.label}
            </Button>
            <Button
              nativeButton={false}
              variant="outline"
              size="lg"
              render={
                <a
                  href={finalCta.secondaryCta.href}
                  target="_blank"
                  rel="noreferrer"
                />
              }
            >
              {finalCta.secondaryCta.label}
            </Button>
          </div>
          <p className="mt-6 text-sm text-subtle-foreground">{finalCta.note}</p>
        </div>
      </Container>
    </Section>
  )
}
