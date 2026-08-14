import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

import { footer, hero, nav } from "@/content/site"

const OLD_ACCOUNT = "23050adb6c92e313643a29e1ba64c88a"
const NEW_ACCOUNT = "7df185a18b98382c3240fa7ac4a37075"

const repoRoot = resolve(import.meta.dirname, "../../../..")

describe("documented Cloudflare account", () => {
  it("README names the live account and does not keep the previous one", () => {
    const readme = readFileSync(resolve(repoRoot, "README.md"), "utf8")
    const accountLine = readme
      .split("\n")
      .find((line) => line.includes("CLOUDFLARE_ACCOUNT_ID"))

    expect(accountLine).toBeDefined()
    expect(accountLine).toContain(NEW_ACCOUNT)
    expect(readme).not.toContain(OLD_ACCOUNT)
  })
})

describe("landing after folding unused sections", () => {
  it("exports nav and footer without the removed how-it-works anchors", () => {
    expect(nav.links.map((link) => link.href)).not.toContain("#how-it-works")
    expect(nav.links.map((link) => link.href)).toContain("#skills")
    expect(
      footer.columns.flatMap((column) => column.links.map((link) => link.href)),
    ).not.toContain("#how-it-works")
  })

  it("hero proof names the Claude Agent SDK path", () => {
    expect(hero.proofPoints).toContain("Claude Agent SDK · any model")
  })

  it("Landing no longer mounts the deleted HowItWorks or AnyRouter sections", () => {
    const source = readFileSync(
      resolve(import.meta.dirname, "../components/landing/landing.tsx"),
      "utf8",
    )
    expect(source).toContain("import { Hero }")
    expect(source).toContain("import { Connections }")
    expect(source).not.toContain("how-it-works")
    expect(source).not.toContain("from \"@/components/landing/anyrouter\"")
    expect(source).not.toContain("<HowItWorks")
    expect(source).not.toContain("<AnyRouter")
    expect(source).not.toContain("<Skills")
  })
})
