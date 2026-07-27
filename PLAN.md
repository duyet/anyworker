# PLAN — AnyWorker monorepo

Status: `[ ]` todo · `[~]` in progress · `[x]` done

## Goal

Ship a monorepo with marketing (`apps/web`) and product (`apps/anyworker`) where the agent
runs on the **Claude Agent SDK**, multi-provider settings exist, and the UI is a local-first
coworker inspired by OpenWorker.

## Phases

### Phase 0 — Monorepo shell `[x]`

- [x] Move marketing into `apps/web` as `@anyworker/web`
- [x] Root pnpm workspace + scripts
- [x] Root CLAUDE.md / README

### Phase 1 — Product scaffold `[x]`

- [x] `apps/anyworker/server` FastAPI: health, providers, sessions, WS
- [x] `apps/anyworker/gui` React shell: workspace, sessions, chat, settings, approvals UI
- [ ] Tauri shell supervising the Python sidecar

### Phase 2 — Claude Agent SDK path `[~]`

- [x] `CasRunner` + `can_use_tool` approval bridge
- [x] Wire events → GUI transcript
- [ ] End-to-end smoke with real API key
- [ ] Interrupt / stop turn polish
- [ ] Session resume via CAS session id

### Phase 3 — Multi-provider Path B `[ ]`

- [x] Provider registry (Anthropic, AnyRouter, OpenAI, Ollama, generic)
- [x] Secret store under app data dir
- [ ] Thin OpenAI-compatible tool loop
- [ ] Capability badge polish

### Phase 4 — UX polish `[ ]`

- [ ] Onboarding wizard
- [ ] Skills catalog surface
- [ ] Artifacts panel
- [ ] Deeper OpenWorker UI port (composer, markdown, right rail)

### Phase 5 — Quality & packaging `[ ]`

- [x] Basic pytest for health/sessions
- [ ] GUI unit tests
- [ ] macOS packaging

## Verify

```bash
pnpm --filter @anyworker/web typecheck && pnpm --filter @anyworker/web build
cd apps/anyworker/server && uv run pytest
pnpm --filter @anyworker/gui typecheck
```
