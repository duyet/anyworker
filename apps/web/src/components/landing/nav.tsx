import { Menu } from "lucide-react"

import { Container } from "@/components/landing/primitives"
import { AnyWorkerMark } from "@/components/landing/wordmark"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { nav, site } from "@/content/site"
import { cn } from "@/lib/utils"

/**
 * The site header.
 *
 * Every label comes from `@/content/site`; the only literal string here is the
 * screen-reader name on the menu trigger, whose icon is decorative.
 *
 * The sheet closes itself: each link is a Base UI `Dialog.Close` rendered as an
 * anchor, so there is no open state to hold and no click handler to forget.
 */

const LINK_STYLE =
  "text-sm text-muted-foreground transition-colors hover:text-foreground"

export function SiteNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <Container className="flex h-16 items-center justify-between gap-6">
        <a href="/" className="flex items-center gap-2.5">
          <AnyWorkerMark className="size-6 text-foreground" />
          <span className="font-display text-lg">{site.name}</span>
        </a>

        <nav className="hidden items-center gap-7 md:flex">
          {nav.links.map((link) => (
            <a key={link.href} href={link.href} className={LINK_STYLE}>
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href={nav.secondary.href}
            target="_blank"
            rel="noreferrer"
            className={cn(LINK_STYLE, "hidden md:inline")}
          >
            {nav.secondary.label}
          </a>

          <Button
            nativeButton={false}
            render={<a href={nav.cta.href} />}
            size="lg"
          >
            {nav.cta.label}
          </Button>

          <Sheet>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon-lg" className="md:hidden" />
              }
            >
              <Menu aria-hidden="true" />
              <span className="sr-only">Menu</span>
            </SheetTrigger>

            <SheetContent side="right" className="gap-6 p-6">
              <SheetTitle className="font-display text-lg">
                {site.name}
              </SheetTitle>

              <div className="flex flex-col">
                {nav.links.map((link) => (
                  <SheetClose
                    key={link.href}
                    render={<a href={link.href} />}
                    className="py-2.5 text-base text-foreground transition-colors hover:text-brand"
                  >
                    {link.label}
                  </SheetClose>
                ))}
                <SheetClose
                  render={
                    <a
                      href={nav.secondary.href}
                      target="_blank"
                      rel="noreferrer"
                    />
                  }
                  className="py-2.5 text-base text-foreground transition-colors hover:text-brand"
                >
                  {nav.secondary.label}
                </SheetClose>
              </div>

              <SheetClose
                render={<a href={nav.cta.href} />}
                className={cn(buttonVariants({ size: "lg" }), "w-full")}
              >
                {nav.cta.label}
              </SheetClose>
            </SheetContent>
          </Sheet>
        </div>
      </Container>
    </header>
  )
}
