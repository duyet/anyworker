import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  connectSessionWs,
  createSession,
  getHealth,
  getMessages,
  getProviders,
  getSessions,
  getSettings,
  openWorkspace,
  setActive,
  setProviderProfile,
  type Provider,
  type SessionInfo,
  type WireEvent,
} from "./api";
import { cn } from "./lib/utils";

type ChatItem =
  | { kind: "user"; text: string }
  | { kind: "assistant"; text: string }
  | { kind: "tool"; name: string; status: "start" | "end" }
  | { kind: "status"; text: string }
  | { kind: "error"; text: string }
  | {
      kind: "approval";
      id: string;
      tool: string;
      reason: string;
      args: Record<string, unknown>;
    };

export function App() {
  const [healthOk, setHealthOk] = useState<boolean | null>(null);
  const [workspace, setWorkspace] = useState("");
  const [workspaceInput, setWorkspaceInput] = useState("");
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [items, setItems] = useState<ChatItem[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [provider, setProvider] = useState("anthropic");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<ReturnType<typeof connectSessionWs> | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const activeProvider = useMemo(
    () => providers.find((p) => p.name === provider),
    [providers, provider],
  );

  const refreshSessions = useCallback(async (ws?: string) => {
    const list = await getSessions(ws || undefined);
    setSessions(list);
    return list;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const h = await getHealth();
        if (cancelled) return;
        setHealthOk(true);
        const ws = h.default_workspace || "";
        setWorkspace(ws);
        setWorkspaceInput(ws);
        if (h.provider) setProvider(h.provider);
        if (h.model) setModel(h.model);
        const [p, settings, list] = await Promise.all([
          getProviders(),
          getSettings(),
          getSessions(ws || undefined),
        ]);
        if (cancelled) return;
        setProviders(p);
        if (settings.active?.provider) setProvider(settings.active.provider);
        if (settings.active?.model) setModel(settings.active.model);
        setSessions(list);
      } catch (e) {
        if (!cancelled) {
          setHealthOk(false);
          setError(
            e instanceof Error
              ? e.message
              : "Cannot reach anyworker-server on :8765",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [items]);

  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  const attachWs = useCallback((id: string) => {
    wsRef.current?.close();
    wsRef.current = connectSessionWs(id, (ev: WireEvent) => {
      if (ev.type === "turn_start") setBusy(true);
      if (ev.type === "turn_end") setBusy(false);
      if (ev.type === "text" || ev.type === "text_delta") {
        const text = String(ev.payload?.text ?? "");
        if (!text) return;
        setItems((prev) => {
          const last = prev[prev.length - 1];
          if (ev.type === "text_delta" && last?.kind === "assistant") {
            return [
              ...prev.slice(0, -1),
              { kind: "assistant", text: last.text + text },
            ];
          }
          if (ev.type === "text" && last?.kind === "assistant") {
            // Prefer full block replace if model sends complete text blocks.
            return [...prev.slice(0, -1), { kind: "assistant", text: last.text + text }];
          }
          return [...prev, { kind: "assistant", text }];
        });
      }
      if (ev.type === "tool_start") {
        setItems((prev) => [
          ...prev,
          {
            kind: "tool",
            name: String(ev.payload?.name ?? "tool"),
            status: "start",
          },
        ]);
      }
      if (ev.type === "permission_required") {
        setItems((prev) => [
          ...prev,
          {
            kind: "approval",
            id: String(ev.id || ev.payload?.id || ""),
            tool: String(ev.payload?.tool_name ?? "tool"),
            reason: String(ev.payload?.reason ?? "Approval required"),
            args: (ev.payload?.arguments as Record<string, unknown>) || {},
          },
        ]);
      }
      if (ev.type === "error") {
        setItems((prev) => [
          ...prev,
          {
            kind: "error",
            text: String(ev.payload?.message ?? "Unknown error"),
          },
        ]);
        setBusy(false);
      }
    });
  }, []);

  const selectSession = async (id: string) => {
    setSessionId(id);
    const msgs = await getMessages(id);
    setItems(
      msgs.map((m) =>
        m.role === "user"
          ? { kind: "user" as const, text: String(m.content ?? "") }
          : { kind: "assistant" as const, text: String(m.content ?? "") },
      ),
    );
    attachWs(id);
  };

  const onOpenWorkspace = async () => {
    const path = workspaceInput.trim();
    if (!path) return;
    const res = await openWorkspace(path);
    if (!res.ok) {
      setError(res.error || "Could not open workspace");
      return;
    }
    setWorkspace(res.path || path);
    setError(null);
    await refreshSessions(res.path || path);
  };

  const onNewSession = async () => {
    if (!workspace) {
      setError("Open a workspace first");
      return;
    }
    const s = await createSession({
      workspace,
      provider,
      model,
      title: "New session",
    });
    await refreshSessions(workspace);
    await selectSession(s.id);
  };

  const onSaveSettings = async () => {
    const profile: Record<string, string> = {};
    if (apiKey) profile.api_key = apiKey;
    if (baseUrl) profile.base_url = baseUrl;
    if (Object.keys(profile).length) {
      await setProviderProfile(provider, profile);
    }
    await setActive({ provider, model, workspace: workspace || undefined });
    setShowSettings(false);
    setApiKey("");
  };

  const onSend = () => {
    const text = draft.trim();
    if (!text || !sessionId || busy) return;
    setItems((prev) => [...prev, { kind: "user", text }]);
    setDraft("");
    wsRef.current?.send({ type: "user_message", text });
  };

  const onApprove = (id: string, outcome: "once" | "always_tool" | "deny") => {
    wsRef.current?.send({ type: "approval", id, outcome });
    setItems((prev) =>
      prev.map((it) =>
        it.kind === "approval" && it.id === id
          ? { kind: "status", text: `Approval: ${outcome} for ${it.tool}` }
          : it,
      ),
    );
  };

  return (
    <div className="flex h-full min-h-0 bg-background text-foreground">
      <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <div className="text-sm font-semibold tracking-tight">AnyWorker</div>
            <div className="text-[11px] text-muted-foreground">
              {healthOk === null
                ? "Connecting…"
                : healthOk
                  ? "Server online"
                  : "Server offline"}
            </div>
          </div>
          <button
            type="button"
            className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-surface-muted"
            onClick={() => setShowSettings((v) => !v)}
          >
            Settings
          </button>
        </div>

        <div className="space-y-2 border-b border-border p-3">
          <label className="block text-[11px] uppercase tracking-wide text-muted-foreground">
            Workspace
          </label>
          <input
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs"
            value={workspaceInput}
            onChange={(e) => setWorkspaceInput(e.target.value)}
            placeholder="/path/to/project"
          />
          <button
            type="button"
            onClick={onOpenWorkspace}
            className="w-full rounded-md bg-brand px-2 py-1.5 text-xs font-medium text-brand-foreground"
          >
            Open folder
          </button>
          <button
            type="button"
            onClick={onNewSession}
            className="w-full rounded-md border border-border px-2 py-1.5 text-xs hover:bg-surface-muted"
          >
            New session
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {sessions.length === 0 ? (
            <p className="px-2 py-4 text-xs text-muted-foreground">
              No sessions yet.
            </p>
          ) : (
            sessions.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => selectSession(s.id)}
                className={cn(
                  "mb-1 w-full rounded-md px-2 py-2 text-left text-xs hover:bg-surface-muted",
                  sessionId === s.id && "bg-surface-muted",
                )}
              >
                <div className="truncate font-medium">{s.title}</div>
                <div className="truncate text-[10px] text-muted-foreground">
                  {s.harness === "cas" ? "Full agent" : "Compat"} · {s.model || s.provider}
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        {showSettings ? (
          <div className="flex-1 overflow-y-auto p-6">
            <h1 className="mb-4 text-lg font-semibold">Model settings</h1>
            <div className="max-w-md space-y-3">
              <label className="block text-xs text-muted-foreground">Provider</label>
              <select
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                value={provider}
                onChange={(e) => {
                  const name = e.target.value;
                  setProvider(name);
                  const p = providers.find((x) => x.name === name);
                  if (p?.recommended_model) setModel(p.recommended_model);
                  const baseField = p?.fields.find((f) => f.key === "base_url");
                  setBaseUrl(baseField?.default || "");
                }}
              >
                {providers.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.title} ({p.harness === "cas" ? "Full agent" : "Compat"})
                  </option>
                ))}
              </select>
              {activeProvider?.blurb ? (
                <p className="text-xs text-muted-foreground">{activeProvider.blurb}</p>
              ) : null}
              <label className="block text-xs text-muted-foreground">Model</label>
              <input
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="model id"
              />
              <label className="block text-xs text-muted-foreground">API key</label>
              <input
                type="password"
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="leave blank to keep existing / env"
              />
              <label className="block text-xs text-muted-foreground">Base URL</label>
              <input
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="optional"
              />
              <button
                type="button"
                onClick={onSaveSettings}
                className="rounded-md bg-brand px-3 py-2 text-sm font-medium text-brand-foreground"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <>
            <header className="border-b border-border px-4 py-3">
              <div className="text-sm font-medium">
                {sessionId
                  ? sessions.find((s) => s.id === sessionId)?.title || "Session"
                  : "Pick or create a session"}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {workspace || "No workspace"} · {provider}
                {model ? ` / ${model}` : ""}
              </div>
            </header>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {error ? (
                <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
                  {error}
                </div>
              ) : null}
              {!sessionId ? (
                <div className="rounded-xl border border-border bg-surface p-6 text-sm text-muted-foreground">
                  Open a workspace, configure a model in Settings, then start a session.
                  Path A (Anthropic / AnyRouter) runs on the Claude Agent SDK.
                </div>
              ) : null}
              {items.map((it, i) => (
                <ChatRow key={i} item={it} onApprove={onApprove} />
              ))}
              {busy ? (
                <div className="text-xs text-muted-foreground">Working…</div>
              ) : null}
              <div ref={bottomRef} />
            </div>

            <div className="border-t border-border p-3">
              <div className="flex gap-2">
                <textarea
                  className="min-h-[44px] flex-1 resize-none rounded-md border border-border bg-surface px-3 py-2 text-sm"
                  placeholder={
                    sessionId
                      ? "Ask for an outcome — a memo, a summary, a fix…"
                      : "Create a session to chat"
                  }
                  value={draft}
                  disabled={!sessionId || busy}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      onSend();
                    }
                  }}
                />
                <button
                  type="button"
                  disabled={!sessionId || busy || !draft.trim()}
                  onClick={onSend}
                  className="rounded-md bg-brand px-4 text-sm font-medium text-brand-foreground disabled:opacity-40"
                >
                  Send
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function ChatRow({
  item,
  onApprove,
}: {
  item: ChatItem;
  onApprove: (id: string, outcome: "once" | "always_tool" | "deny") => void;
}) {
  if (item.kind === "user") {
    return (
      <div className="ml-8 rounded-lg border border-border bg-surface px-3 py-2 text-sm">
        {item.text}
      </div>
    );
  }
  if (item.kind === "assistant") {
    return (
      <div className="mr-8 whitespace-pre-wrap rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm">
        {item.text}
      </div>
    );
  }
  if (item.kind === "tool") {
    return (
      <div className="font-mono text-[11px] text-muted-foreground">
        tool · {item.name} · {item.status}
      </div>
    );
  }
  if (item.kind === "error") {
    return (
      <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
        {item.text}
      </div>
    );
  }
  if (item.kind === "status") {
    return <div className="text-[11px] text-muted-foreground">{item.text}</div>;
  }
  if (item.kind === "approval") {
    return (
      <div className="rounded-lg border border-brand/40 bg-surface px-3 py-3 text-sm">
        <div className="mb-1 font-medium">Approve {item.tool}?</div>
        <div className="mb-2 text-xs text-muted-foreground">{item.reason}</div>
        <pre className="mb-3 max-h-28 overflow-auto rounded bg-background p-2 text-[11px] text-muted-foreground">
          {JSON.stringify(item.args, null, 2)}
        </pre>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-md bg-brand px-2 py-1 text-xs font-medium text-brand-foreground"
            onClick={() => onApprove(item.id, "once")}
          >
            Allow once
          </button>
          <button
            type="button"
            className="rounded-md border border-border px-2 py-1 text-xs"
            onClick={() => onApprove(item.id, "always_tool")}
          >
            Always this tool
          </button>
          <button
            type="button"
            className="rounded-md border border-danger/40 px-2 py-1 text-xs text-danger"
            onClick={() => onApprove(item.id, "deny")}
          >
            Deny
          </button>
        </div>
      </div>
    );
  }
  return null;
}
