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
| Convert | Pricing → FAQ → CTA | |

## Phases

### Phase 0 — Scaffold `[x]`

- [x] `shadcn init --preset b1au7YYAi --template start --base base` (TanStack Start + Base UI)
- [x] Relocate scaffold to repo root, fix pnpm workspace-root check
- [x] Install `@base-ui/react`, `lucide-react`, `clsx`, `tailwind-merge`, `cva`,
      `tw-animate-css`, `@fontsource-variable/inter`
- [x] `CLAUDE.md` + `PLAN.md`

**Verify:** `pnpm dev` boots on :3000.

### Phase 1 — Design system `[ ]`

- [ ] `src/styles.css` — Tailwind v4 `@theme` with semantic tokens, then three
      `[data-theme="…"]` blocks re-pointing them
- [ ] `src/components/theme.tsx` — `ThemeScope` applying `data-theme` + per-variant font class
- [ ] Self-host Inter; add serif display face for `paper`, mono for `studio` labels
- [ ] Shared primitives: `Section`, `Eyebrow`, `Headline` (two-tone), `Card`, `Badge`, `Button`

**Token contract** — every section may use only these:
`background` `surface` `surface-muted` `foreground` `muted-foreground` `border` `accent`
`accent-foreground` `accent-muted` `ring` · `font-display` `font-sans` `font-mono` ·
`rounded-card` `rounded-pill` · `shadow-card`

**Verify:** flipping `data-theme` on `<html>` in devtools restyles the whole page with zero
layout shift.

### Phase 2 — Content `[ ]`

- [ ] `src/content/site.ts` — every string on the page, typed. Nav, hero, capabilities (6),
      steps (3), skills (6), model providers, tool connections, anyrouter, plugins, control,
      pricing (3), faq (6), footer
- [ ] `status: "live" | "soon"` on every integration — nothing fictional rendered as shipped

**Verify:** grep the `landing/` folder for quoted prose — there should be none.

### Phase 3 — Sections `[ ]`

In page order, one file each in `src/components/landing/`:

- [ ] `nav.tsx` — sticky, blurred, mobile sheet
- [ ] `hero.tsx` — two-tone headline, dual CTA, flow diagram (You ask → AnyWorker → Your tools)
- [ ] `capabilities.tsx` — 6-card grid
- [ ] `how-it-works.tsx` — flow panel + 3 numbered steps
- [ ] `skills.tsx` — role cards with "Works with" / "Checks in" footers
- [ ] `connections.tsx` — model providers + everyday tools, inline SVG logos
- [ ] `anyrouter.tsx` — free-models differentiator, visually the loudest block
- [ ] `plugins.tsx` — Claude plugin compatibility
- [ ] `control.tsx` — approval gates, audit trail, local-first
- [ ] `pricing.tsx` — Free / Pro / Team
- [ ] `faq.tsx` — Base UI Accordion
- [ ] `cta.tsx` + `footer.tsx`
- [ ] `logos.tsx` — inline brand SVGs (currentColor where the mark allows)

**Verify:** each section renders identically-structured in all three themes.

### Phase 4 — Routes `[ ]`

- [ ] `routes/index.tsx` → `clarity` · `routes/d/paper.tsx` · `routes/d/studio.tsx`
- [ ] `routes/d/index.tsx` — variant picker with screenshots-in-page
- [ ] `__root.tsx` — real title/description/OG, favicon, drop devtools from prod build
- [ ] Prerender all routes to static HTML

**Verify:** `dist/client` contains an `index.html` per route.

### Phase 5 — Hono API `[ ]`

- [ ] `src/routes/api/$.ts` — Hono app mounted at `/api`
- [ ] `GET /api/health` → `{ ok: true }`
- [ ] `POST /api/waitlist` → validates email, 202. No storage yet (no KV provisioned) —
      log only, and say so in the response

**Verify:** `curl localhost:3000/api/health` → 200.

### Phase 6 — Cloudflare Workers `[ ]`

- [ ] `wrangler.jsonc` — name `anyworker-web`, `main: dist/server/index.js`,
      `assets: { directory: dist/client, binding: ASSETS }`, `compatibility_date`,
      `nodejs_compat`, observability on
- [ ] Vite config for the Workers target
- [ ] `pnpm cf-typegen` → `worker-configuration.d.ts`
- [ ] `pnpm deploy`

**Verify:** deployed URL returns 200 with correct HTML; `/api/health` returns JSON.

### Phase 7 — Quality `[ ]`

- [ ] Responsive pass at 375 / 768 / 1440
- [ ] Keyboard traversal + visible focus rings, all three themes
- [ ] Contrast audit — `studio` and `paper` are the risky ones
- [ ] `prefers-reduced-motion` fallbacks
- [ ] Lighthouse ≥ 95 performance / 100 a11y on `/`
- [ ] `git init` + commit

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
