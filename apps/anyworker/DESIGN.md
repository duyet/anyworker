# AnyWorker app design

> AnyWorker is the AI coworker for people who don't code.

This document sets the product direction for `apps/anyworker`. It describes what the
app should be, what exists today, and the order we build in. Issues link here.

## Where we are

The shell works. A FastAPI sidecar on `127.0.0.1:8765` runs two agent paths — the
Claude Agent SDK (`CasRunner`) and an OpenAI-compatible tool loop (`CompatRunner`) —
and streams events to a React GUI over one WebSocket per session. Sign-in with
AnyRouter, the model picker, and BYOK all talk to real endpoints. Approvals round-trip
end to end.

What is missing is the part that makes it a coworker instead of a chat window.

## Four gaps

**1. The app asks you to think like a developer.**
The sidebar wants a filesystem path typed into a text box. The "Open folder" button
renders but has no click handler. The four use-case cards ask you to index a codebase
and build a RAG pipeline. None of that is for someone who doesn't code.

**2. Nothing survives the window.**
Sessions persist a 200-message tail to `sessions.json` and nothing else. There is no
run history, no record of what the agent did, no cost or usage view. Artifacts are
tracked by filename only — you cannot open what the agent wrote. Close the app and
the work is gone.

**3. Control is shallow.**
Approvals work, but "Always allow" is forgotten immediately: `run_user_turn` builds a
new runner every turn, so the runner's allow-list starts empty each time. There is no
audit trail of what ran, and the right rail's "Access" panel is a hardcoded list that
does not reflect real permissions.

**4. Built capability is unreachable.**
The plugins backend is complete and tested — install, list, uninstall, skills. The
GUI view for it is never imported. The GitHub proxy has no caller. Typing an API key
into Settings → Model silently discards it, because `setProviderProfile` is never
called.

## Principles

**Outcomes, not tools.** The user asks for a memo, not for `WriteFile`. Tool names are
progressive disclosure, never the primary surface.

**Show the work.** Every run leaves a trace: what was read, what was written, what was
approved. Trust comes from being able to look.

**Local by default.** Files stay on the machine. The workspace is a folder the user
picked, and the app never reaches outside it without asking.

**Nothing fake.** No hardcoded capability lists, no mock panels, no dead views. If it
is not built, it says so.

## Direction: the desk

The app is a desk, not a chatbot. Three regions, all backed by real state:

- **Left — the work.** Sessions grouped by workspace. A real folder picker. Each
  session shows whether it is running, waiting on approval, or done.
- **Centre — the conversation.** Where you hand over work and watch it happen.
- **Right — the evidence.** Files the agent touched, artifacts you can open and
  preview, and the permissions actually in force for this workspace.

## Build order

### M1 — Trust and foundations
Durable permission policy, activity log, workspace file API, and the `App.tsx`
decomposition that unblocks parallel GUI work.

### M2 — The desk
Real folder picker, file and artifact panel with preview, run history, plugins
reachable from navigation, non-technical use-case templates.

### M3 — Ship
Tauri shell, first-run onboarding, completion notifications, WebSocket reconnect,
GUI test harness.

## Voice

Plain English, second person, verbs first. Sentences under 20 words. No
*comprehensive*, *elaborate*, *extensive*, *seamless*, *leverage*, *unlock*. No
exclamation marks. Claims must be things the product does.

This applies to UI copy as much as marketing copy. The current use-case templates in
`gui/src/types.ts` violate it and are being replaced.
