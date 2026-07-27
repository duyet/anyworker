import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router"

import { site } from "@/content/site"
import appCss from "../styles.css?url"

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: `${site.name} — ${site.tagline}` },
      { name: "description", content: site.description },
      { property: "og:title", content: `${site.name} — ${site.tagline}` },
      { property: "og:description", content: site.description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `https://${site.domain}` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: `${site.name} — ${site.tagline}` },
      { name: "twitter:description", content: site.description },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
    ],
  }),
  notFoundComponent: NotFound,
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  // No router hooks in here: this shell renders outside the router context and
  // only ever receives `children`. The design direction is applied by the
  // <ThemeScope> each route renders, and styles.css mirrors it onto the root
  // scroller with `html:has([data-theme=…])`.
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}

function NotFound() {
  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-display text-5xl text-brand">404</p>
      <p className="text-muted-foreground">
        That page does not exist. Try the{" "}
        <a href="/" className="text-brand underline underline-offset-4">
          home page
        </a>
        .
      </p>
    </main>
  )
}
