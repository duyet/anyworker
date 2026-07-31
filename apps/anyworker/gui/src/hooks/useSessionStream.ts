import { useCallback, useEffect, useRef, useState } from "react";
import {
  connectSessionWs,
  getMessages,
  resolveApproval,
  type WireEvent,
} from "../api";
import type { ChatItem } from "../types";

export type Artifact = { name: string; kind: string; content: string };

/**
 * The session WebSocket: wire events reduced into chat items, artifacts
 * captured from WriteFile results, plus send / interrupt / approve.
 */
export function useSessionStream() {
  const [items, setItems] = useState<ChatItem[]>([]);
  const [busy, setBusy] = useState(false);
  // Track artifacts produced during the session (files written via WriteFile tool)
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);

  const wsRef = useRef<{ send: (msg: unknown) => void; close: () => void } | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  const addItem = useCallback((item: ChatItem) => {
    setItems((prev) => [...prev, item]);
  }, []);

  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  const attachWs = useCallback((id: string) => {
    sessionIdRef.current = id;
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

  /** Open an existing session: clear the transcript, replay history, attach. */
  const openSession = useCallback(
    async (id: string) => {
      sessionIdRef.current = id;
      setItems([]);
      setArtifacts([]);
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
    },
    [attachWs],
  );

  /** Open a freshly created session: empty transcript, attach. */
  const openNewSession = useCallback(
    (id: string) => {
      setItems([]);
      setArtifacts([]);
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
    addItem,
    openSession,
    openNewSession,
    sendUserMessage,
    interrupt,
    approve,
  };
}

export type SessionStream = ReturnType<typeof useSessionStream>;
