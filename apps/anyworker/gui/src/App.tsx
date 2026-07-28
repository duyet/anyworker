import { useCallback, useEffect, useRef, useState } from "react";
import {
  getSessions,
  getMessages,
  getProviders,
  getSettings,
  setActive,
  createSession as apiCreateSession,
  connectSessionWs,
  resolveApproval,
  type Provider,
  type SessionInfo,
  type WireEvent,
} from "./api";
import type { ChatItem, UseCaseTemplate } from "./types";
import { USE_CASE_TEMPLATES } from "./types";
import { Settings } from "./views/Settings";
import { Sidebar } from "./components/Sidebar";
import { ChatRow } from "./components/ChatRow";
import { UseCasePicker } from "./components/UseCasePicker";
import { RightRail } from "./components/RightRail";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Sparkles, MessageSquare, PanelRight } from "lucide-react";

export function App() {
  const [workspace, setWorkspace] = useState("");
  const [workspaceInput, setWorkspaceInput] = useState("");
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [items, setItems] = useState<ChatItem[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [provider, setProvider] = useState("anyrouter");
  const [model, setModel] = useState("anyrouter/cowork");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showTemplates, setShowTemplates] = useState(true);
  const [chatTitle, setChatTitle] = useState("");
  const [showRightRail, setShowRightRail] = useState(true);

  // Track artifacts produced during the session (files written via WriteFile tool)
  const [artifacts, setArtifacts] = useState<
    Array<{ name: string; kind: string; content: string }>
  >([]);

  const wsRef = useRef<{ send: (msg: unknown) => void; close: () => void } | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // Load providers + settings on mount
  useEffect(() => {
    getProviders()
      .then((list) => {
        setProviders(list);
        // Try to load saved settings
        getSettings()
          .then((settings) => {
            const active = settings.active;
            if (active.provider) setProvider(active.provider);
            if (active.model) setModel(active.model);
            if (active.workspace) {
              setWorkspace(active.workspace);
              setWorkspaceInput(active.workspace);
            }
          })
          .catch(() => {
            /* use defaults */
          });
      })
      .catch(() => {
        /* use defaults */
      });
    getSessions()
      .then((list) => {
        setSessions(list);
        if (list.length > 0) {
          // Auto-select the most recent session
          const mostRecent = list[0];
          setSessionId(mostRecent.id);
          setChatTitle(mostRecent.title);
          setWorkspace(mostRecent.workspace || "");
          setWorkspaceInput(mostRecent.workspace || "");
          setProvider(mostRecent.provider);
          setModel(mostRecent.model);
        }
      })
      .catch(() => {
        /* no sessions */
      });
  }, []);

  const addItem = useCallback((item: ChatItem) => {
    setItems((prev) => [...prev, item]);
  }, []);

  const onSend = useCallback(() => {
    const text = draft.trim();
    if (!text || busy || !sessionId) return;

    if (showTemplates) setShowTemplates(false);

    addItem({ kind: "user", text });
    setDraft("");
    wsRef.current?.send({ type: "user_message", text });
  }, [draft, busy, sessionId, showTemplates, addItem]);

  const onPickTemplate = useCallback((t: UseCaseTemplate) => {
    setDraft(t.prompt);
    setShowTemplates(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const refreshSessions = useCallback(async (ws?: string) => {
    try {
      const list = await getSessions(ws);
      setSessions(list);
    } catch {
      /* keep */
    }
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
          if (last?.kind === "assistant")
            return [...prev.slice(0, -1), { kind: "assistant", text: last.text + text }];
          return [...prev, { kind: "assistant", text }];
        });
      }
      if (ev.type === "tool_start") {
        setItems((prev) => [
          ...prev,
          { kind: "tool", name: String(ev.payload?.name ?? "tool"), status: "start" },
        ]);
      }
      if (ev.type === "tool_end") {
        setItems((prev) => {
          const last = prev[prev.length - 1];
          if (last?.kind === "tool")
            return [...prev.slice(0, -1), { ...last, status: "end", result: String(ev.payload?.result ?? "") }];
          return prev;
        });
        // Track artifacts from WriteFile results
        if (ev.payload?.name === "WriteFile") {
          try {
            const result = JSON.parse(String(ev.payload?.result ?? "{}"));
            if (result.ok && result.path) {
              setArtifacts((prev) => [
                ...prev,
                { name: result.path.split("/").pop() || result.path, kind: "File", content: "" },
              ]);
            }
          } catch {
            /* ignore */
          }
        }
      }
      if (ev.type === "permission_required") {
        setItems((prev) => [
          ...prev,
          {
            kind: "approval",
            id: String(ev.id || ev.payload?.id || ""),
            tool: String(ev.payload?.tool_name ?? ev.payload?.name ?? "tool"),
            reason: String(ev.payload?.reason ?? "Approval required"),
            args: (ev.payload?.arguments as Record<string, unknown>) || {},
          },
        ]);
      }
      if (ev.type === "error") {
        setItems((prev) => [
          ...prev,
          { kind: "error", text: String(ev.payload?.message ?? "Unknown error") },
        ]);
      }
    });
  }, []);

  const selectSession = async (id: string) => {
    setSessionId(id);
    setShowTemplates(false);
    setItems([]);
    setArtifacts([]);
    const s = sessions.find((s) => s.id === id);
    if (s) {
      setChatTitle(s.title);
      setWorkspace(s.workspace || "");
      setWorkspaceInput(s.workspace || "");
      setProvider(s.provider);
      setModel(s.model);
    }

    try {
      const msgs = await getMessages(id);
      setItems(
        msgs.map((m: { role: string; content?: string }) =>
          m.role === "user"
            ? { kind: "user" as const, text: String(m.content ?? "") }
            : { kind: "assistant" as const, text: String(m.content ?? "") },
        ),
      );
      attachWs(id);
    } catch {
      setItems([]);
    }
  };

  const createSession = async () => {
    const ws = workspace || workspaceInput;
    try {
      const session = await apiCreateSession({
        workspace: ws,
        title: "New session",
        provider,
        model,
      });
      setSessions((prev) => [session, ...prev]);
      setSessionId(session.id);
      setChatTitle(session.title);
      setShowTemplates(true);
      setItems([]);
      setArtifacts([]);
      setProvider(session.provider);
      setModel(session.model);
      attachWs(session.id);

      // Persist the active provider/model/workspace
      await setActive({ provider: session.provider, model: session.model, workspace: session.workspace });
    } catch (e) {
      addItem({
        kind: "error",
        text: e instanceof Error ? e.message : "Could not create session.",
      });
    }
  };

  const onApprove = useCallback(
    async (approvalId: string, outcome: "once" | "always_tool" | "deny") => {
      try {
        await resolveApproval(sessionId!, approvalId, outcome);
      } catch (e) {
        addItem({
          kind: "error",
          text: e instanceof Error ? e.message : "Could not resolve approval.",
        });
      }
    },
    [sessionId, addItem],
  );

  const handleWorkspaceSet = () => {
    const p = workspaceInput.trim();
    if (p) {
      setWorkspace(p);
      refreshSessions(p);
    }
  };

  const handleInterrupt = () => {
    if (wsRef.current) {
      wsRef.current.send({ type: "interrupt" });
    }
  };

  return (
    <div className="flex h-full min-h-0 bg-background text-foreground">
      <Sidebar
        workspace={workspace}
        workspaceInput={workspaceInput}
        onWorkspaceInputChange={setWorkspaceInput}
        onWorkspaceSet={handleWorkspaceSet}
        sessions={sessions}
        sessionId={sessionId}
        onSelectSession={selectSession}
        onCreateSession={createSession}
        onOpenSettings={() => setShowSettings((v) => !v)}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        {showSettings ? (
          <Settings
            providers={providers}
            provider={provider}
            onProviderChange={setProvider}
            model={model}
            onModelChange={setModel}
            apiKey={apiKey}
            onApiKeyChange={setApiKey}
            baseUrl={baseUrl}
            onBaseUrlChange={setBaseUrl}
            onSave={async () => {
              setShowSettings(false);
              setApiKey("");
              try {
                await setActive({ provider, model, workspace: workspace || workspaceInput });
              } catch {
                /* ignore */
              }
            }}
          />
        ) : (
          <>
            <header className="border-b border-border px-4 py-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div>
                  <div className="text-sm font-medium flex items-center gap-2">
                    <MessageSquare className="size-3.5 text-muted-foreground" />
                    {chatTitle || (sessionId ? "Session" : "No session selected")}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {workspace || "No workspace"} · {provider}{model ? ` / ${model}` : ""}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 items-center">
                {busy && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[11px] h-7 text-destructive"
                    onClick={handleInterrupt}
                  >
                    Stop
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={() => setShowRightRail((v) => !v)}
                  aria-label={showRightRail ? "Hide panel" : "Show panel"}
                >
                  <PanelRight className="size-4" />
                </Button>
              </div>
            </header>

            <ScrollArea className="flex-1 overflow-y-auto">
              <div className="min-h-full flex flex-col">
                {showTemplates && !sessionId ? (
                  <div className="flex-1 flex items-center justify-center">
                    <UseCasePicker templates={USE_CASE_TEMPLATES} onPick={onPickTemplate} />
                  </div>
                ) : showTemplates && items.length === 0 ? (
                  <UseCasePicker templates={USE_CASE_TEMPLATES} onPick={onPickTemplate} />
                ) : items.length === 0 && !busy ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center max-w-md">
                      <Sparkles className="size-8 text-brand/50 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">
                        Ask for an outcome — a memo, a summary, a fix…
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="max-w-3xl mx-auto w-full p-4 space-y-4 flex-1">
                    {items.map((it, i) => (
                      <ChatRow key={i} item={it} onApprove={onApprove} />
                    ))}
                    {busy && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground pl-4">
                        <span className="size-1.5 rounded-full bg-muted-foreground animate-pulse" />
                        <span className="size-1.5 rounded-full bg-muted-foreground animate-pulse" style={{ animationDelay: "0.15s" }} />
                        <span className="size-1.5 rounded-full bg-muted-foreground animate-pulse" style={{ animationDelay: "0.3s" }} />
                        Working…
                      </div>
                    )}
                    <div ref={bottomRef} />
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="border-t border-border shrink-0">
              <div className="max-w-3xl mx-auto p-4">
                <div className="flex gap-2 items-end">
                  <div className="flex-1 relative">
                    <textarea
                      ref={inputRef}
                      className="min-h-[52px] max-h-[200px] w-full resize-none rounded-xl border border-input bg-background px-4 py-3 pr-12 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 placeholder:text-muted-foreground/60"
                      placeholder={sessionId ? "Ask for an outcome — a memo, a summary, a fix…" : "Create a session to chat"}
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
                  </div>
                  <Button
                    size="icon"
                    disabled={!sessionId || busy || !draft.trim()}
                    onClick={onSend}
                    className="size-[52px] shrink-0 rounded-xl"
                  >
                    <Send className="size-4" />
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground/50 text-center mt-2">
                  AnyWorker uses the Claude Agent SDK and OpenAI-compatible tools. Tools run locally with your approval.
                </p>
              </div>
            </div>
          </>
        )}
      </main>

      {showRightRail && !showSettings && (
        <RightRail artifacts={artifacts} provider={provider} model={model} />
      )}
    </div>
  );
}
