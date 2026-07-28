# CLAUDE.md — AnyWorker monorepo

**AnyWorker** is an open alternative to Claude Cowork / OpenWorker.

## Layout

```text
apps/web/                 # Marketing landing (Cloudflare Workers)
apps/anyworker/
  server/                 # Python FastAPI sidecar + Claude Agent SDK
  gui/                    # React desktop UI (Tauri later)
packages/                 # Shared TS packages (optional)
```

## Positioning

> AnyWorker is the AI coworker for people who don't code.

1. **It does the work, it doesn't just answer.**
2. **Built for non-technical people.**
3. **Free models included** via [anyrouter.dev](https://anyrouter.dev).

Secondary: **Claude plugins/skills drop in** (Path A / Claude Agent SDK).

### Voice

Plain English, second person, verbs first. No *comprehensive*, *elaborate*, *extensive*,
*seamless*, *revolutionize*, *empower*, *leverage*, *unlock*. Sentences under 20 words.
No exclamation marks. Claims must be things the product does.

## apps/web (marketing)

| Concern | Choice |
|---|---|
| Framework | TanStack Start (file-router) |
| UI | Base UI + shadcn `base-rhea` |
| Styling | Tailwind v4, three `data-theme` variants |
| Copy | `src/content/site.ts` only — do not hardcode prose in JSX |
| Host | Worker name `anyworker-web` |

```bash
pnpm --filter @anyworker/web dev
pnpm --filter @anyworker/web typecheck
pnpm --filter @anyworker/web build
pnpm --filter @anyworker/web deploy
```

Static first. No external network at runtime. Unbuilt integrations use `status: "soon"`.

## apps/anyworker (product)

| Layer | Stack |
|---|---|
| Agent | **Claude Agent SDK** (`claude-agent-sdk`) — Path A |
| Compat models | Thin OpenAI-compatible loop (`CompatRunner`) — Path B (live) |
| API | FastAPI on loopback `127.0.0.1:8765` |
| UI | React 19 + Vite + Tailwind v4 (studio tokens) |
| Shell | Tauri 2 (next) |

Do **not** port openworker's aisuite `TurnEngine`. Reuse product concepts (sessions, approvals, providers, workspace) and redesign UI under AnyWorker brand.

```bash
cd apps/anyworker/server && uv sync && uv run anyworker-server
pnpm --filter @anyworker/gui dev
cd apps/anyworker/server && uv run pytest
```

### Honesty

Do not invent customer logos, user counts, or live connectors. Mark unbuilt features clearly.

## Package manager

**pnpm** workspace root. Add deps with `pnpm add -F @anyworker/web <pkg>` or `-w` for root.

## Cloudflare

Resource names prefixed `anyworker-`. Never commit `.env.local` / `.dev.vars`.

## CI

- Default branch: **main**
- Web deploys on every mainline change under `apps/web` (`.github/workflows/deploy-web.yml`)
- App packages on every mainline change under `apps/anyworker` (artifacts + commit comment)
- Releases: release-please on `apps/web` + `apps/anyworker`, patch-only `0.1.x`
- Do **not** auto-merge release-please PRs
