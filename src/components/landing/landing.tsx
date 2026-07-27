import { AnyRouter } from "@/components/landing/anyrouter"
import { Capabilities } from "@/components/landing/capabilities"
import { Connections } from "@/components/landing/connections"
import { Control } from "@/components/landing/control"
import { Faq } from "@/components/landing/faq"
import { FinalCta } from "@/components/landing/cta"
import { Footer } from "@/components/landing/footer"
import { Hero } from "@/components/landing/hero"
import { HowItWorks } from "@/components/landing/how-it-works"
import { Plugins } from "@/components/landing/plugins"
import { SiteNav } from "@/components/landing/nav"
import { Skills } from "@/components/landing/skills"
import { ThemeScope } from "@/components/landing/theme-scope"
import type { ThemeId } from "@/content/site"

/**
 * The whole page, in narrative order. All three design directions render this
 * exact tree — the only thing that differs is the `theme` passed in. There is no
 * per-variant branching anywhere below this component, and adding one would
 * defeat the point of the token contract.
 */
export function Landing({ theme }: { theme: ThemeId }) {
  return (
    <ThemeScope theme={theme}>
      <SiteNav />
      <main>
        <Hero />
        <Capabilities />
        <HowItWorks />
        <Skills />
        <Connections />
        <AnyRouter />
        <Plugins />
        <Control />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </ThemeScope>
  )
}
