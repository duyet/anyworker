import { useCallback, useEffect, useRef, useState } from "react";
import { getMessages, resolveApproval, type WireEvent } from "../api";
import type { ChatItem } from "../types";

export type Artifact = { name: string; kind: string; content: string };

/** Connection state of the session WebSocket, surfaced to the UI. */
export type ConnectionState = "connected" | "reconnecting" | "offline";

const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30_000;

/** Same base-url resolution api.ts uses for the session WS, kept local so
 * this hook can own the raw socket (needed for close/error visibility that
 * api.ts's connectSessionWs does not expose). */
const wsBase = (): string =>
  (globalThis as { __ANYWORKER_WS__?: string }).__ANYWORKER_WS__ ||
  import.meta.env.VITE_ANYWORKER_WS ||
  "ws://127.0.0.1:8765";

type RawMessage = { role: string; content?: string };

const toItem = (m: RawMessage): ChatItem =>
  m.role === "user"
    ? { kind: "user", text: String(m.content ?? "") }
    : { kind: "assistant", text: String(m.content ?? "") };

/**
 * The session WebSocket: wire events reduced into chat items, artifacts
 * captured from WriteFile results, plus send / interrupt / approve.
 */
export function useSessionStream() {
  const [items, setItems] = useState<ChatItem[]>([]);
  const [busy, setBusy] = useState(false);
  // Track artifacts produced during the session (files written via WriteFile tool)
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [connectionState, setConnectionState] = useState<ConnectionState>("offline");

  const wsRef = useRef<{ send: (msg: unknown) => void; close: () => void } | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  // Reconnect bookkeeping.
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intentionalCloseRef = useRef(false);
  const unmountedRef = useRef(false);
  // Count of messages already reconciled from getMessages(), used to append
  // only the tail on reconnect instead of duplicating the whole transcript.
  const syncedMessageCountRef = useRef(0);

  const addItem = useCallback((item: ChatItem) => {
    setItems((prev) => [...prev, item]);
  }, []);

  const handleEvent = useCallback((ev: WireEvent) => {
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
  }, []);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const closeSocket = useCallback(() => {
    clearReconnectTimer();
    if (wsRef.current) {
      intentionalCloseRef.current = true;
      wsRef.current.close();
      wsRef.current = null;
    }
  }, [clearReconnectTimer]);

  /** Refetch messages after a reconnect and append only what's new, so
   * anything streamed during the gap isn't lost and nothing already shown
   * is duplicated. Assumes getMessages is append-only. */
  const refetchAfterReconnect = useCallback(async (id: string) => {
    try {
      const msgs = await getMessages(id);
      if (unmountedRef.current || sessionIdRef.current !== id) return;
      const tail = msgs.slice(syncedMessageCountRef.current).map(toItem);
      if (tail.length > 0) {
        setItems((prev) => {
          let merged = prev;
          for (const item of tail) {
            const last = merged[merged.length - 1];
            // Drop a trailing in-progress item this new item supersedes
            // (e.g. a partially-streamed assistant reply completed server-side).
            if (last && last.kind === item.kind && (last.kind === "user" || last.kind === "assistant")) {
              const lastText = "text" in last ? last.text : "";
              const itemText = "text" in item ? item.text : "";
              if (itemText === lastText || itemText.startsWith(lastText)) {
                merged = merged.slice(0, -1);
              }
            }
            merged = [...merged, item];
          }
          return merged;
        });
      }
      syncedMessageCountRef.current = msgs.length;
    } catch {
      /* offline refetch is best-effort; live events will keep filling in */
    }
  }, []);

  const openSocketRef = useRef<(id: string) => void>(() => {});

  const scheduleReconnect = useCallback((id: string) => {
    if (unmountedRef.current || sessionIdRef.current !== id) return;
    setConnectionState("reconnecting");
    const attempt = reconnectAttemptRef.current;
    reconnectAttemptRef.current = attempt + 1;
    const cap = Math.min(RECONNECT_BASE_MS * 2 ** attempt, RECONNECT_MAX_MS);
    const delay = Math.random() * cap; // full jitter
    reconnectTimerRef.current = setTimeout(() => {
      reconnectTimerRef.current = null;
      openSocketRef.current(id);
    }, delay);
  }, []);

  openSocketRef.current = (id: string) => {
    if (unmountedRef.current || sessionIdRef.current !== id) return;
    setConnectionState((prev) => (prev === "connected" ? prev : "reconnecting"));
    const ws = new WebSocket(`${wsBase()}/v1/sessions/${id}/ws`);

    ws.onopen = () => {
      if (unmountedRef.current || sessionIdRef.current !== id) return;
      const wasReconnect = reconnectAttemptRef.current > 0;
      reconnectAttemptRef.current = 0;
      setConnectionState("connected");
      if (wasReconnect) void refetchAfterReconnect(id);
    };

    ws.onmessage = (e) => {
      if (unmountedRef.current || sessionIdRef.current !== id) return;
      try {
        handleEvent(JSON.parse(e.data));
      } catch {
        /* ignore */
      }
    };

    ws.onclose = () => {
      wsRef.current = null;
      if (unmountedRef.current || sessionIdRef.current !== id) return;
      if (intentionalCloseRef.current) {
        intentionalCloseRef.current = false;
        return;
      }
      scheduleReconnect(id);
    };

    wsRef.current = {
      send: (msg: unknown) => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
      },
      close: () => ws.close(),
    };
  };

  useEffect(() => {
    return () => {
      unmountedRef.current = true;
      closeSocket();
    };
  }, [closeSocket]);

  const attachWs = useCallback(
    (id: string) => {
      sessionIdRef.current = id;
      closeSocket();
      intentionalCloseRef.current = false;
      reconnectAttemptRef.current = 0;
      openSocketRef.current(id);
    },
    [closeSocket],
  );

  /** Open an existing session: clear the transcript, replay history, attach. */
  const openSession = useCallback(
    async (id: string) => {
      sessionIdRef.current = id;
      setItems([]);
      setArtifacts([]);
      try {
        const msgs = await getMessages(id);
        setItems(msgs.map(toItem));
        syncedMessageCountRef.current = msgs.length;
        attachWs(id);
      } catch {
        setItems([]);
        syncedMessageCountRef.current = 0;
      }
    },
    [attachWs],
  );

  /** Open a freshly created session: empty transcript, attach. */
  const openNewSession = useCallback(
    (id: string) => {
      setItems([]);
      setArtifacts([]);
      syncedMessageCountRef.current = 0;
      attachWs(id);
    },
    [attachWs],
  );

  const sendUserMessage = useCallback(
    (text: string) => {
      addItem({ kind: "user", text });
      wsRef.current?.send({ type: "user_message", text });
    },
    [addItem],
  );

  const interrupt = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.send({ type: "interrupt" });
    }
  }, []);

  const approve = useCallback(
    async (approvalId: string, outcome: "once" | "always_tool" | "deny") => {
      try {
        await resolveApproval(sessionIdRef.current!, approvalId, outcome);
      } catch (e) {
        addItem({
          kind: "error",
          text: e instanceof Error ? e.message : "Could not resolve approval.",
        });
      }
    },
    [addItem],
  );

  return {
    items,
    busy,
    artifacts,
    connectionState,
    addItem,
    openSession,
    openNewSession,
    sendUserMessage,
    interrupt,
    approve,
  };
}

export type SessionStream = ReturnType<typeof useSessionStream>;
