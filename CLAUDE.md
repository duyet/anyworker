# CLAUDE.md — anyworker.dev

Marketing landing page for **AnyWorker**, an open alternative to Claude Cowork / OpenWorker.
Static-first, deployed to Cloudflare Workers.

## Positioning

> AnyWorker is the AI coworker for people who don't code.

Three claims the page must land, in priority order:

1. **It does the work, it doesn't just answer.** Ask for an outcome — a finished deck,
   a sent message, an updated sheet — not for a chat reply.
2. **Built for non-technical people.** Skills and connections ship built-in. No API keys,
   no YAML, no terminal. Setup is picking things from a list.
3. **Free models included.** Wired to [anyrouter.dev](https://anyrouter.dev) free-tier models
   out of the box, so the zero-cost path is the default path, not a downgrade.

Secondary claim: **backward compatible with Claude plugins/skills** — existing plugins drop in.

### Voice

Plain English, second person, verbs first. Say "sends the message", not "facilitates
communication workflows". Never use *comprehensive*, *elaborate*, *extensive*, *seamless*,
*revolutionize*, *empower*, *leverage*, *unlock*. Sentences under 20 words. No exclamation marks.

Claims must be things the product does, not adjectives about it. If a line survives being
pasted onto a competitor's site unchanged, it is too generic — rewrite it.

## Stack

| Concern | Choice | Notes |
|---|---|---|
| Framework | TanStack Start (file-router) | `src/routes/`, `routeTree.gen.ts` is generated — never hand-edit |
| Server | Hono | mounted for `/api/*` only; the pages are prerendered |
| UI primitives | Base UI (`@base-ui/react`) | via shadcn `base` registry, **not** Radix |
| Components | shadcn preset `b1au7YYAi`, style `base-rhea` | see `components.json` |
| Styling | Tailwind v4 | CSS-first config in `src/styles.css`, no `tailwind.config.js` |
| Icons | `lucide-react` | |
| Type | `@fontsource-variable/inter` | self-hosted, no external font requests |
| Package manager | **pnpm** | this repo is a pnpm workspace root; `pnpm add` needs `-w` |
| Host | Cloudflare Workers | all resource names prefixed `anyworker-` |

## Commands

```bash
pnpm dev          # vite dev on :3000
pnpm build        # vite build -> dist/client (assets) + dist/server (worker)
pnpm typecheck    # tsc --noEmit
pnpm lint         # eslint
pnpm preview      # wrangler dev against the built output
pnpm deploy       # wrangler deploy
pnpm cf-typegen   # regenerate worker-configuration.d.ts from wrangler.jsonc
```

Verify with `pnpm typecheck && pnpm lint && pnpm build` before claiming done.

## Architecture

### Content lives in data, not JSX

All page copy is in `src/content/site.ts` as typed objects. Section components read from it.
**To change wording, edit `site.ts` — do not edit JSX.** This is what keeps the three design
variants in sync: they render identical content through different themes.

### Three design variants, one component tree

```
/            → theme "studio"   (near-black, lime, mono labels)  ← the chosen one
/d/clarity   → theme "clarity"  (light, blue, Inter)
/d/paper     → theme "paper"    (cream, clay, serif display)
/d           → index page linking all three
```

`/d/studio` also exists and renders the same page as `/`, so the comparison
page keeps three working links.

Every variant renders the **same** `<Landing>` component. The difference is a `data-theme`
attribute on the page root, which re-points the CSS custom properties defined in
`src/styles.css`. Section components must never hardcode a colour, font, or radius — only
semantic tokens (`bg-background`, `text-muted-foreground`, `border-border`, `font-display`,
`rounded-card`).

Consequence: a section built for one variant works in all three for free. If you find
yourself writing `dark:` or `theme === "studio" ? ... : ...` inside a section, the token
set is missing something — add the token instead.

Changing the default = change the one word in `src/routes/index.tsx`. Nothing else.

### Layout

```
src/
  content/site.ts        # ALL copy + data (nav, hero, capabilities, skills, tools, faq…)
  components/
    landing/             # page sections — one file per section, in page order
    ui/                  # shadcn/Base UI primitives — generated, avoid hand-editing
    theme.tsx            # ThemeScope provider, applies data-theme
  routes/
    index.tsx            # /            → <Landing theme="clarity" />
    d/index.tsx          # /d           → variant picker
    d/paper.tsx          # /d/paper
    d/studio.tsx         # /d/studio
    api/$.ts             # Hono catch-all for /api/*
  styles.css             # Tailwind v4 @theme + the three data-theme token blocks
```

## Rules

- **Static first.** Every route prerenders. No server-side data fetching on the landing page.
  If a section needs runtime data, it is the wrong section.
- **No external network at runtime.** Fonts self-hosted, icons bundled, no analytics script
  from a CDN, no remote images. Brand logos come from `simple-icons` via
  `src/components/landing/logos.tsx`. Slack, OpenAI, Outlook and Z.AI are **not** in that set,
  so they render as lettermarks. Do not hand-draw replacements — an approximated mark is worse
  than an obviously-generic one.
- **Accessibility is not optional.** Every interactive element reachable by keyboard with a
  visible focus ring. Colour contrast ≥ 4.5:1 for body text in all three themes — check
  `studio` and `paper` specifically, they are the ones that break.
- **Respect `prefers-reduced-motion`.** Any animation must have a no-motion fallback.
- **Don't add a component library.** Base UI + Tailwind covers this page. No Framer Motion,
  no Radix, no icon pack beyond lucide.
- Adding a shadcn component: `pnpm dlx shadcn@latest add <name>` — it resolves against the
  `base` registry automatically via `components.json`.

## Cloudflare

All named resources use the `anyworker-` prefix:

- Worker: `anyworker-web`
- Any future KV/D1/R2: `anyworker-<purpose>`

`wrangler.jsonc` is the source of truth. Static assets are served by the `assets` binding from
`dist/client`; the worker entry (`dist/server/index.js`) only handles `/api/*` and SSR misses.

Never commit `.env.local` or `.dev.vars`.

## Honesty constraint

This is a marketing page for a product that is early. Do **not** invent:

- customer logos, testimonials, or quotes from named people
- user counts, funding, revenue, or "trusted by N teams"
- integrations that are not real — mark unbuilt ones `soon` via the `status` field in
  `site.ts`, and render them visibly dimmed with a "soon" badge

Fabricated social proof is the one thing that makes the whole page untrustworthy. Placeholder
logos are fine only if visibly labelled as illustrative.
