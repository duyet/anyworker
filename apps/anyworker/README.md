# apps/anyworker

Main AnyWorker product: local desktop coworker (MVP).

| Path | Role |
|---|---|
| `server/` | Python FastAPI sidecar — Claude Agent SDK (Path A) + OpenAI-compatible loop (Path B) + provider registry |
| `gui/` | React UI (Vite). Tauri shell comes next |

## Dev

Terminal 1:

```bash
cd apps/anyworker/server
uv sync
export ANTHROPIC_API_KEY=…   # or configure AnyRouter in the UI
uv run anyworker-server --port 8765
```

Terminal 2 (repo root):

```bash
pnpm install
pnpm dev:gui
```

Open http://127.0.0.1:5173 — open a workspace, set model in Settings, new session, chat.
