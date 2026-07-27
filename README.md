# AnyWorker

Open alternative to Claude Cowork / OpenWorker — AI that does the work.

## Monorepo

| App | Path | What |
|---|---|---|
| Marketing site | `apps/web` | anyworker.dev (TanStack Start → Cloudflare Workers) |
| Product | `apps/anyworker` | Local agent (Python + Claude Agent SDK) + React GUI |

## Commands

```bash
pnpm install

# Marketing
pnpm dev:web          # http://localhost:3000
pnpm build:web
pnpm deploy:web       # → Cloudflare (anyworker.dev)

# Product GUI (needs server running)
pnpm dev:gui          # http://127.0.0.1:5173
pnpm dev:server       # http://127.0.0.1:8765  (requires uv)
bash scripts/package-app.sh   # GUI zip + server wheel → dist/app/
```

Server setup:

```bash
cd apps/anyworker/server
uv sync
uv run anyworker-server
```

## CI / release (GitHub Actions)

| Workflow | Trigger | Does |
|---|---|---|
| `ci.yml` | PR + push to `master` | typecheck/build web + gui, pytest server |
| `deploy-web.yml` | push `master` (paths: `apps/web/**`) | always deploy Worker to Cloudflare |
| `build-app.yml` | push `master` (paths: `apps/anyworker/**`) | package app, upload artifacts, commit comment with download link |
| `release-please.yml` | push `master` | standing release PRs for `web` + `app` (`v0.1.x` patch only) |
| `release.yml` | after merge of release-please PR | attach assets to GitHub Release (+ deploy web) |

**Secrets (repo Settings → Secrets):**

- `CLOUDFLARE_API_TOKEN` — Workers deploy
- `CLOUDFLARE_ACCOUNT_ID` — `23050adb6c92e313643a29e1ba64c88a`

**release-please:** also enable *Allow GitHub Actions to create and approve pull requests*.

Version policy: `versioning: always-bump-patch` → stays on **0.1.x** until config changes.

See `apps/anyworker/README.md` and root `CLAUDE.md`.
