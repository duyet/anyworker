import { useCallback, useEffect, useState } from "react";
import {
  createSession as apiCreateSession,
  getSessions,
  setActive,
  type SessionInfo,
} from "../api";
import type { ChatItem } from "../types";
import type { SettingsState } from "./useSettings";

type Options = {
  settings: SettingsState;
  /** Open an existing session in the stream (history + WebSocket). */
  onOpenSession: (id: string) => void;
  /** Open a freshly created session in the stream. */
  onOpenNewSession: (id: string) => void;
  onError: (item: ChatItem) => void;
};

/** The session list, the active session, and create / select. */
export function useSession({
  settings,
  onOpenSession,
  onOpenNewSession,
  onError,
}: Options) {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [chatTitle, setChatTitle] = useState("");
  const [showTemplates, setShowTemplates] = useState(true);

  const { adoptSession, provider, model, workspace, workspaceInput } = settings;

  useEffect(() => {
    getSessions()
      .then((list) => {
        setSessions(list);
        if (list.length > 0) {
          // Auto-select the most recent session
          const mostRecent = list[0];
          setSessionId(mostRecent.id);
          setChatTitle(mostRecent.title);
          adoptSession(mostRecent);
        }
      })
      .catch(() => {
        /* no sessions */
      });
    // Mount only, matching the previous single-shot load. adoptSession is stable.
  }, [adoptSession]);

  const refreshSessions = useCallback(async (ws?: string) => {
    try {
      const list = await getSessions(ws);
      setSessions(list);
    } catch {
      /* keep */
    }
  }, []);

  const selectSession = useCallback(
    (id: string) => {
      setSessionId(id);
      setShowTemplates(false);
      const s = sessions.find((s) => s.id === id);
      if (s) {
        setChatTitle(s.title);
        adoptSession(s);
      }
      void onOpenSession(id);
    },
    [sessions, adoptSession, onOpenSession],
  );

  const createSession = useCallback(async () => {
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
      settings.setProvider(session.provider);
      settings.setModel(session.model);
      onOpenNewSession(session.id);

      // Persist the active provider/model/workspace
      await setActive({
        provider: session.provider,
        model: session.model,
        workspace: session.workspace,
      });
    } catch (e) {
      onError({
        kind: "error",
        text: e instanceof Error ? e.message : "Could not create session.",
      });
    }
  }, [workspace, workspaceInput, provider, model, settings, onOpenNewSession, onError]);

  const hideTemplates = useCallback(() => setShowTemplates(false), []);

  return {
    sessions,
    sessionId,
    chatTitle,
    showTemplates,
    hideTemplates,
    refreshSessions,
    selectSession,
    createSession,
  };
}
