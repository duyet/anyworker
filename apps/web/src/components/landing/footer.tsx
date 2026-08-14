"use client"

import { useEffect, useState } from "react"

import { footer, site } from "@/content/site"
import { Container } from "@/components/landing/primitives"
import { cn } from "@/lib/utils"

export function Footer() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    const theme = root.getAttribute("data-theme")
    setDark(theme === "studio")
  }, [])

  const toggleDark = () => {
    const root = document.documentElement
    const current = root.getAttribute("data-theme")
    const next = current === "studio" ? "clarity" : "studio"
    root.setAttribute("data-theme", next)
    setDark(next === "studio")
  }

  return (
    <footer className="border-t border-border bg-surface-muted py-14">
      <Container>
        <div className="grid gap-10 lg:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div>
            <p className="font-display text-lg">{site.name}</p>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              {footer.blurb}
            </p>
          </div>
          {footer.columns.map((column) => (
            <div key={column.title}>
              <h3 className="mb-3 text-sm font-medium text-foreground">
                {column.title}
              </h3>
              <ul className="flex flex-col gap-2">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      {...(link.href.startsWith("http")
                        ? { target: "_blank", rel: "noreferrer" }
                        : {})}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-wrap justify-between gap-4 border-t border-border pt-6 text-sm text-subtle-foreground">
          <p>{footer.legal}</p>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">{footer.darkmode.label}</span>
            <button
              type="button"
              role="switch"
              aria-checked={dark}
              aria-label="Toggle dark mode"
              onClick={toggleDark}
              className={cn(
                "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                dark ? "bg-brand" : "bg-muted",
              )}
            >
              <span
                className={cn(
                  "inline-block size-4 transform rounded-full bg-background transition-transform",
                  dark ? "translate-x-5" : "translate-x-1",
                )}
              />
            </button>
            <p>{`© ${new Date().getFullYear()} ${site.name}`}</p>
          </div>
        </div>
      </Container>
    </footer>
  )
}
