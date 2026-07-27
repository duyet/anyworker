# AnyWorker server

Local agent sidecar for the AnyWorker desktop app.

- **Path A:** [Claude Agent SDK](https://code.claude.com/docs/en/agent-sdk/overview) (`ClaudeSDKClient`)
- **Path B:** OpenAI-compatible thin loop (stub in MVP — settings registry is live)

## Dev

```bash
cd apps/anyworker/server
uv sync
uv run anyworker-server --port 8765
```

```bash
curl http://127.0.0.1:8765/v1/health
```

Set `ANTHROPIC_API_KEY` (or configure AnyRouter via `POST /v1/providers/anyrouter`).

State lives under the platform app-data dir (`AnyWorker`), or `ANYWORKER_STATE_DIR`.
