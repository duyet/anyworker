# PLAN — anyworker.dev landing page

Status legend: `[ ]` todo · `[~]` in progress · `[x]` done

## Goal

Ship a static marketing landing page for **AnyWorker** — an open alternative to Claude Cowork
and OpenWorker — on Cloudflare Workers at `anyworker.dev`, in **three design variants** so the
winner can be picked from live pages rather than a mockup.

**Done means:** `pnpm typecheck && pnpm lint && pnpm build` all pass, `wrangler deploy` returns
a live URL, and all four routes (`/`, `/d`, `/d/paper`, `/d/studio`) render correctly at
375px / 768px / 1440px with no console errors.

## Product story the page tells

| Beat | Section | The line |
|---|---|---|
| Hook | Hero | "Ask for the outcome. AnyWorker handles the steps." |
| It acts | Capabilities | Six things it does that a chat box cannot |
| It's simple | How it works | Choose a model → connect tools → delegate |
| It's ready | Skills | Sales, Marketing, Legal, EA, Ops — preconfigured |
| It's yours | Connections | Any model, any tool, including fully local |
| **It's free** | AnyRouter | Free models built in — the differentiator |
| It's compatible | Plugins | Existing Claude plugins and skills drop in |
| It's safe | Control | Checks in before anything irreversible |
| Convert | FAQ → CTA | |

Pricing was cut after the first build — see "Changes from the original plan".

## Phases

### Phase 0 — Scaffold `[x]`

- [x] `shadcn init --preset b1au7YYAi --template start --base base` (TanStack Start + Base UI)
- [x] Relocate scaffold to repo root, fix pnpm workspace-root check
- [x] Install `@base-ui/react`, `lucide-react`, `clsx`, `tailwind-merge`, `cva`,
      `tw-animate-css`, `@fontsource-variable/inter`
- [x] `CLAUDE.md` + `PLAN.md`

**Verify:** `pnpm dev` boots on :3000.

### Phase 1 — Design system `[x]`

- [x] `src/styles.css` — Tailwind v4 `@theme` with semantic tokens, then three
      `[data-theme="…"]` blocks re-pointing them
- [x] `src/components/landing/theme-scope.tsx` — `ThemeScope` applying `data-theme`
- [x] Self-host Inter; add serif display face for `paper`, mono for `studio` labels
- [x] Shared primitives: `Section`, `Container`, `Eyebrow`, `Headline` (two-tone), `Lede`,
      `SectionHeader`, `IconBox`. Card/Badge/Button come from the shadcn registry, not here.

**Token contract** — every section may use only these:
`background` `surface` `surface-muted` `foreground` `muted-foreground` `subtle-foreground`
`border` `border-strong` `brand` `brand-foreground` `brand-muted` `brand-soft` `ring`, plus the
shadcn set (`card` `primary` `secondary` `muted` `accent` `destructive` `input`) ·
`font-display` `font-sans` `font-mono` · `rounded-card` `rounded-control` `rounded-pill` ·
`shadow-card` `shadow-lift` · `eyebrow` `hero-wash` `tabular`

**Note:** the brand colour is `brand`, NOT `accent`. The generated shadcn components already use
`accent` to mean "subtle hover surface"; the two collided, so brand was renamed.

**Verify:** flipping `data-theme` on `<html>` in devtools restyles the whole page with zero
layout shift.

### Phase 2 — Content `[x]`

- [x] `src/content/site.ts` — every string on the page, typed. Nav, hero, capabilities (6),
      steps (3), skills (6), model providers, tool connections, anyrouter, plugins, control,
      faq (6), footer
- [x] `status: "live" | "soon"` on every integration — nothing fictional rendered as shipped

**Verify:** grep the `landing/` folder for quoted prose — there should be none.

### Phase 3 — Sections `[x]`

In page order, one file each in `src/components/landing/`:

- [x] `nav.tsx` — sticky, blurred, mobile sheet
- [x] `hero.tsx` — two-tone headline, dual CTA, flow diagram (You ask → AnyWorker → Your tools)
- [x] `capabilities.tsx` — 6-card grid
- [x] `how-it-works.tsx` — flow panel + 3 numbered steps
- [x] `skills.tsx` — role cards with "Works with" / "Checks in" footers
- [x] `connections.tsx` — model providers + everyday tools, inline SVG logos
- [x] `anyrouter.tsx` — free-models differentiator, visually the loudest block
- [x] `plugins.tsx` — Claude plugin compatibility
- [x] `control.tsx` — approval gates, audit trail, local-first
- [x] `faq.tsx` — Base UI Accordion
- [x] `cta.tsx` + `footer.tsx`
- [x] `logos.tsx` — inline brand SVGs (currentColor where the mark allows)

**Verify:** each section renders identically-structured in all three themes.

### Phase 4 — Routes `[x]`

- [x] `routes/index.tsx` → `clarity` · `routes/d/paper.tsx` · `routes/d/studio.tsx`
- [x] `routes/d/index.tsx` — variant picker with screenshots-in-page
- [x] `__root.tsx` — real title/description/OG, favicon, drop devtools from prod build
- [x] Prerender all routes to static HTML

**Verify:** `dist/client` contains an `index.html` per route.

### Phase 5 — Hono API `[x]`

- [x] `src/routes/api/$.ts` — Hono app mounted at `/api`
- [x] `GET /api/health` → `{ ok: true }`
- [x] `POST /api/waitlist` → validates email, 202. No storage yet (no KV provisioned) —
      log only, and say so in the response

**Verify:** `curl localhost:3000/api/health` → 200.

### Phase 6 — Cloudflare Workers `[x]`

- [x] `wrangler.jsonc` — name `anyworker-web`, `main: "@tanstack/react-start/server-entry"`
      (a package specifier, not a dist path — the vite plugin resolves it and populates the
      assets directory itself), `compatibility_date`, `nodejs_compat`, observability on
- [x] Vite config for the Workers target
- [x] `pnpm cf-typegen` → `worker-configuration.d.ts`
- [x] `pnpm deploy`

**Verify:** deployed URL returns 200 with correct HTML; `/api/health` returns JSON.

### Phase 7 — Quality `[~]`

- [x] Responsive pass at 375 — verified zero horizontally-overflowing elements
- [x] Contrast audit — found and fixed two real AA failures (below)
- [x] Lighthouse on all three variants: **a11y 100, best practices 100, SEO 100**
- [x] `prefers-reduced-motion` fallback (global, in `styles.css`)
- [x] `git init` + commit
- [ ] **Not done:** manual keyboard traversal of all three themes
- [ ] **Not done:** Lighthouse *performance* score — the audit run covers a11y / SEO / best
      practices only; performance needs a separate trace
- [ ] **Not done:** visual pass at 768 and 1440 below the hero fold

## Changes from the original plan

- **Pricing removed** on request. The nav slot became "Plugins", the footer slot became "Free
  models" (`#free-models`, a new id on the AnyRouter section), and the "Is it really free?" FAQ
  answer was rewritten so it no longer references plan tiers that are no longer shown.
- **Brand token renamed** `accent` → `brand`, because the generated shadcn components already
  define `accent` as a hover surface and the two meanings collided.
- **Theme moved off `<html>`.** The plan put `data-theme` on the root element via a router hook
  in `shellComponent`. That shell renders *outside* the router context, so the hook threw in dev
  — it happened to work during the production prerender, which made it a latent fragility rather
  than a safe shortcut. The theme now lives on a `ThemeScope` wrapper inside each route, and
  `html:has([data-theme=…])` mirrors only the two properties that must sit on the root element:
  the overscroll background and `color-scheme`.
- **Three accessibility bugs the audit caught that inspection did not:**
  1. `subtle-foreground` was 3.34:1 on white, under the 4.5:1 AA floor. Darkened in all three
     themes; it now sits just above `muted-foreground`, so the hierarchy step below it comes
     from size and weight rather than a lighter grey.
  2. "Soon" pills used `opacity-60`, dragging their labels to 4.48:1. Replaced with a dashed
     border — the "soon" badge already carried the meaning.
  3. All seven link-styled `Button`s needed `nativeButton={false}`; Base UI strips button
     semantics otherwise and logged an error for each.

## Risks

| Risk | Mitigation |
|---|---|
| TanStack Start ↔ Cloudflare Workers config is version-sensitive | Verify against current docs before writing config, not from memory |
| Three themes = 3x the contrast bugs | Token contract + explicit contrast audit in Phase 7 |
| Hono routing conflicting with Start's SSR handler | Scope Hono to `/api/*` only; Start owns everything else |
| Temptation to fabricate social proof | Banned in `CLAUDE.md`; `status` field forces honesty on integrations |

## Open questions

- Does `anyworker.dev` DNS point at Cloudflare yet? Deploy will land on `*.workers.dev` until
  a custom domain route is added.
- Waitlist storage — needs a KV namespace (`anyworker-waitlist`) before `/api/waitlist`
  persists anything. Currently accept-and-log only.
