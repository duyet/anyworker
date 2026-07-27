export type Health = {
  status: string;
  product?: string;
  default_workspace?: string | null;
  model?: string | null;
  provider?: string | null;
};

export type SessionInfo = {
  id: string;
  title: string;
  workspace: string;
  provider: string;
  model: string;
  harness: string;
  created_at?: number;
};

export type Provider = {
  name: string;
  title: string;
  harness: "cas" | "compat" | string;
  needs_key: boolean;
  recommended_model?: string | null;
  blurb?: string;
  fields: Array<{
    key: string;
    label: string;
    secret: boolean;
    required: boolean;
    default?: string;
    placeholder?: string;
  }>;
};

export type WireEvent = {
  type: string;
  session_id: string;
  payload?: Record<string, unknown>;
  id?: string | null;
};

const httpBase = (): string =>
  (globalThis as { __ANYWORKER_HTTP__?: string }).__ANYWORKER_HTTP__ ||
  import.meta.env.VITE_ANYWORKER_HTTP ||
  "http://127.0.0.1:8765";

const wsBase = (): string =>
  (globalThis as { __ANYWORKER_WS__?: string }).__ANYWORKER_WS__ ||
  import.meta.env.VITE_ANYWORKER_WS ||
  "ws://127.0.0.1:8765";

export function getHttpBase() {
  return httpBase();
}

export async function getHealth(): Promise<Health> {
  const res = await fetch(`${httpBase()}/v1/health`);
  if (!res.ok) throw new Error(`health ${res.status}`);
  return res.json();
}

export async function getProviders(): Promise<Provider[]> {
  const res = await fetch(`${httpBase()}/v1/providers`);
  const data = await res.json();
  return data.providers ?? [];
}

export async function getSettings(): Promise<{
  active: Record<string, string>;
  configured: Record<string, { has_key: boolean; base_url: string }>;
}> {
  const res = await fetch(`${httpBase()}/v1/settings`);
  return res.json();
}

export async function setProviderProfile(
  name: string,
  profile: Record<string, string>,
): Promise<void> {
  await fetch(`${httpBase()}/v1/providers/${encodeURIComponent(name)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile }),
  });
}

export async function setActive(body: {
  provider: string;
  model: string;
  workspace?: string;
}): Promise<void> {
  await fetch(`${httpBase()}/v1/settings/active`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function openWorkspace(path: string): Promise<{ ok: boolean; path?: string; error?: string }> {
  const res = await fetch(`${httpBase()}/v1/workspaces/open`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path }),
  });
  return res.json();
}

export async function getSessions(workspace?: string): Promise<SessionInfo[]> {
  const q = workspace ? `?workspace=${encodeURIComponent(workspace)}` : "";
  const res = await fetch(`${httpBase()}/v1/sessions${q}`);
  const data = await res.json();
  return data.sessions ?? [];
}

export async function createSession(body: {
  workspace: string;
  title?: string;
  provider?: string;
  model?: string;
}): Promise<SessionInfo> {
  const res = await fetch(`${httpBase()}/v1/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function getMessages(
  sessionId: string,
): Promise<Array<{ role: string; content?: string }>> {
  const res = await fetch(`${httpBase()}/v1/sessions/${sessionId}/messages`);
  const data = await res.json();
  return data.messages ?? [];
}

export async function deleteSession(sessionId: string): Promise<void> {
  await fetch(`${httpBase()}/v1/sessions/${sessionId}`, { method: "DELETE" });
}

export function connectSessionWs(
  sessionId: string,
  onEvent: (ev: WireEvent) => void,
): { send: (msg: unknown) => void; close: () => void } {
  const ws = new WebSocket(`${wsBase()}/v1/sessions/${sessionId}/ws`);
  ws.onmessage = (e) => {
    try {
      onEvent(JSON.parse(e.data));
    } catch {
      /* ignore */
    }
  };
  return {
    send: (msg) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
    },
    close: () => ws.close(),
  };
}
