import { createFileRoute } from "@tanstack/react-router"
import { ArrowUpRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Container, Headline, Lede } from "@/components/landing/primitives"
import { site, variants } from "@/content/site"

export const Route = createFileRoute("/d/")({
  component: VariantPicker,
})

/**
 * Side-by-side comparison of the three design directions.
 *
 * The previews are live iframes of the real routes rather than screenshots, so
 * they can never drift from what actually ships. They are scaled down with a
 * transform and made inert (`pointer-events-none`) so a stray click inside a
 * preview cannot navigate the frame.
 */
function VariantPicker() {
  return (
    <main className="min-h-svh bg-background py-16">
      <Container>
        <Headline
          as="h1"
          size="lg"
          lines={[
            { text: "Three directions.", accent: false },
            { text: "Same page underneath.", accent: true },
          ]}
        />
        <Lede className="mt-5 max-w-2xl">
          Identical copy and structure in every one. Only the theme layer
          differs, so whichever you pick is already built.
        </Lede>

        <div className="mt-12 grid gap-8 lg:grid-cols-3">
          {variants.map((variant) => (
            <article key={variant.id} className="flex flex-col">
              <div className="relative h-72 overflow-hidden rounded-card border border-border bg-surface-muted">
                <iframe
                  src={variant.href}
                  title={`${variant.name} preview`}
                  loading="lazy"
                  tabIndex={-1}
                  aria-hidden="true"
                  className="pointer-events-none absolute top-0 left-0 h-[1600px] w-[1440px] origin-top-left border-0"
                  style={{ transform: "scale(0.32)" }}
                />
              </div>

              <h2 className="mt-5 font-display text-2xl text-foreground">
                {variant.name}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {variant.summary}
              </p>
              <p className="mt-2 text-sm text-subtle-foreground">
                {variant.notes}
              </p>

              <Button
                nativeButton={false}
                variant="outline"
                className="mt-5 w-fit"
                render={<a href={variant.href} />}
              >
                Open {variant.name}
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </Button>
            </article>
          ))}
        </div>

        <p className="mt-14 text-sm text-subtle-foreground">
          {site.name} — pick one and it becomes the default at /.
        </p>
      </Container>
    </main>
  )
}
