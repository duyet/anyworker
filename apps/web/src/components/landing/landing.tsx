import { Connections } from "@/components/landing/connections"
import { Control } from "@/components/landing/control"
import { Faq } from "@/components/landing/faq"
import { FinalCta } from "@/components/landing/cta"
import { Footer } from "@/components/landing/footer"
import { Hero } from "@/components/landing/hero"
import { Plugins } from "@/components/landing/plugins"
import { SiteNav } from "@/components/landing/nav"
import { ThemeScope } from "@/components/landing/theme-scope"
import type { ThemeId } from "@/content/site"

/**
 * The whole page, in narrative order. All three design directions render this
 * exact tree — the only thing that differs is the `theme` passed in.
 *
 * HowItWorks, AnyRouter, and standalone Skills sections removed: the hero now
 * merges the use-case tabs + live app demo directly, so the duplicated
 * "Out of the box" content is no longer needed below the fold.
 */
export function Landing({ theme }: { theme: ThemeId }) {
  return (
    <ThemeScope theme={theme}>
      <SiteNav />
      <main>
        <Hero />
        <Connections />
        <Plugins />
        <Control />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </ThemeScope>
  )
}
