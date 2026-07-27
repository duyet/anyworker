import { footer, site } from "@/content/site"
import { Container } from "@/components/landing/primitives"

export function Footer() {
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
          <p>{`© ${new Date().getFullYear()} ${site.name}`}</p>
        </div>
      </Container>
    </footer>
  )
}
