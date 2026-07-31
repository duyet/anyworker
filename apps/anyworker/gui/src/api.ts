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

/** AnyRouter account, as returned by GET /v1/auth/anyrouter/account. */
export type AnyRouterAccount = {
  signed_in: boolean;
  user_id?: string | null;
  email?: string | null;
  name?: string | null;
  /** Remaining credit balance, in USD. */
  credits?: number | null;
  /** Management scopes granted at consent. Empty when the user declined. */
  scopes?: string[];
  signed_in_at?: number | null;
};

export type SignInStart = { authorize_url: string; request_id: string };

export type SignInStatus = {
  status: "pending" | "ok" | "error" | string;
  error?: string | null;
};

export type ModelInfo = {
  id: string;
  name?: string | null;
  provider?: string | null;
  description?: string | null;
  context_length?: number | null;
  /** Price per million prompt / completion tokens, in USD. */
  prompt_price?: number | null;
  completion_price?: number | null;
};

export type TopModel = ModelInfo & { requests?: number | null };

export type ModelCatalog = {
  models: ModelInfo[];
  top: TopModel[];
  recommended: string[];
};

export type Preset = {
  slug: string;
  name?: string | null;
  description?: string | null;
  model?: string | null;
};

export type ByokProvider = {
  id: string;
  name: string;
  key_placeholder?: string | null;
  key_hint?: string | null;
  supports_base_url?: boolean;
  default_base_url?: string | null;
  get_key_url?: string | null;
  docs_url?: string | null;
  free_tier?: boolean;
};

export type ByokKey = {
  id: string;
  provider: string;
  /** Masked form of the stored key. The key itself is never returned. */
  key_preview?: string | null;
  enabled?: boolean;
  base_url?: string | null;
  created_at?: number | null;
};

export type ByokTestResult = {
  ok: boolean;
  error?: string | null;
  message?: string | null;
  models?: number | null;
  latency_ms?: number | null;
};

/** A workspace the user has opened before, from GET /v1/workspaces/recent. */
export type RecentWorkspace = {
  path: string;
  name: string;
  exists: boolean;
};

export type Plugin = {
  name: string;
  version: string;
  description: string;
  skills: string[];
  repository: string;
  install_path: string | null;
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
  return req<Health>("/v1/health");
}

export async function getProviders(): Promise<Provider[]> {
  const data = await req<{ providers?: Provider[] }>("/v1/providers");
  return data?.providers ?? [];
}

export async function getSettings(): Promise<{
  active: Record<string, string>;
  configured: Record<string, { has_key: boolean; base_url: string }>;
}> {
  return req("/v1/settings");
}

export async function setProviderProfile(
  name: string,
  profile: Record<string, string>,
): Promise<void> {
  await req(`/v1/providers/${encodeURIComponent(name)}`, {
    method: "POST",
    body: JSON.stringify({ profile }),
  });
}

export async function setActive(body: {
  provider: string;
  model: string;
  workspace?: string;
}): Promise<void> {
  await req("/v1/settings/active", { method: "POST", body: JSON.stringify(body) });
}

/** Resolves with `ok: false` for a bad path; throws only when the request fails. */
export async function openWorkspace(
  path: string,
): Promise<{ ok: boolean; path?: string; error?: string }> {
  return req("/v1/workspaces/open", { method: "POST", body: JSON.stringify({ path }) });
}

export async function getRecentWorkspaces(): Promise<RecentWorkspace[]> {
  const data = await req<{ workspaces?: RecentWorkspace[] }>("/v1/workspaces/recent");
  return data?.workspaces ?? [];
}

export async function getSessions(workspace?: string): Promise<SessionInfo[]> {
  const q = workspace ? `?workspace=${encodeURIComponent(workspace)}` : "";
  const data = await req<{ sessions?: SessionInfo[] }>(`/v1/sessions${q}`);
  return data?.sessions ?? [];
}

export async function createSession(body: {
  workspace: string;
  title?: string;
  provider?: string;
  model?: string;
}): Promise<SessionInfo> {
  return req<SessionInfo>("/v1/sessions", { method: "POST", body: JSON.stringify(body) });
}

export async function getMessages(
  sessionId: string,
): Promise<Array<{ role: string; content?: string }>> {
  const data = await req<{ messages?: Array<{ role: string; content?: string }> }>(
    `/v1/sessions/${encodeURIComponent(sessionId)}/messages`,
  );
  return data?.messages ?? [];
}

export async function deleteSession(sessionId: string): Promise<void> {
  await req(`/v1/sessions/${encodeURIComponent(sessionId)}`, { method: "DELETE" });
}

export async function resolveApproval(
  sessionId: string,
  approvalId: string,
  outcome: "once" | "always_tool" | "deny",
): Promise<void> {
  await req(`/v1/sessions/${sessionId}/approvals/${encodeURIComponent(approvalId)}`, {
    method: "POST",
    body: JSON.stringify({ outcome }),
  });
}

/** Throws on a non-2xx reply so callers can render one failed section only. */
async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${httpBase()}${path}`, {
    ...init,
    headers: init?.body
      ? { "Content-Type": "application/json", ...(init?.headers ?? {}) }
      : init?.headers,
  });
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }
  if (!res.ok) {
    const detail =
      (data as { detail?: string; error?: string } | null)?.detail ||
      (data as { error?: string } | null)?.error;
    throw new Error(detail || `${path} failed (${res.status})`);
  }
  return data as T;
}

const num = (v: unknown): number | null => {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
};

const str = (v: unknown): string | null => (typeof v === "string" ? v : null);

function toModel(raw: Record<string, unknown>): ModelInfo | null {
  const id = str(raw.id) || str(raw.model);
  if (!id) return null;
  const pricing = (raw.pricing ?? {}) as Record<string, unknown>;
  return {
    id,
    name: str(raw.name),
    provider: str(raw.provider) || id.split("/")[0] || null,
    description: str(raw.description),
    context_length: num(raw.context_length ?? raw.context),
    prompt_price: num(raw.prompt_price ?? pricing.prompt),
    completion_price: num(raw.completion_price ?? pricing.completion),
  };
}

function toModels(raw: unknown): ModelInfo[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((m) => (m && typeof m === "object" ? toModel(m as Record<string, unknown>) : null))
    .filter((m): m is ModelInfo => m !== null);
}

export async function startAnyRouterSignIn(): Promise<SignInStart> {
  return req<SignInStart>("/v1/auth/anyrouter/start", { method: "POST", body: "{}" });
}

export async function getAnyRouterSignInStatus(id: string): Promise<SignInStatus> {
  return req<SignInStatus>(`/v1/auth/anyrouter/status/${encodeURIComponent(id)}`);
}

export async function getAnyRouterAccount(): Promise<AnyRouterAccount> {
  const data = await req<Partial<AnyRouterAccount> | null>(
    "/v1/auth/anyrouter/account",
  );
  return {
    signed_in: Boolean(data?.signed_in ?? data?.user_id),
    user_id: data?.user_id ?? null,
    email: data?.email ?? null,
    name: data?.name ?? null,
    credits: typeof data?.credits === "number" ? data.credits : null,
    scopes: Array.isArray(data?.scopes) ? data.scopes : [],
    signed_in_at: data?.signed_in_at ?? null,
  };
}

export async function anyRouterSignOut(): Promise<void> {
  await req("/v1/auth/anyrouter/signout", { method: "POST", body: "{}" });
}

export async function getModelCatalog(): Promise<ModelCatalog> {
  const data = await req<Record<string, unknown>>("/v1/models");
  const models = toModels(data?.data ?? data?.models);
  const topRaw = Array.isArray(data?.top ?? data?.top_models)
    ? ((data?.top ?? data?.top_models) as Record<string, unknown>[])
    : [];
  const top: TopModel[] = topRaw
    .map((m): TopModel | null => {
      const base = toModel(m);
      return base ? { ...base, requests: num(m.requests ?? m.count) } : null;
    })
    .filter((m): m is TopModel => m !== null);
  const recommended = Array.isArray(data?.recommended)
    ? (data.recommended as unknown[]).filter((v): v is string => typeof v === "string")
    : [];
  return { models, top, recommended };
}

export async function getPresets(): Promise<Preset[]> {
  const data = await req<Record<string, unknown>>("/v1/presets");
  const list = data?.presets ?? data?.data;
  if (!Array.isArray(list)) return [];
  return list
    .map((p): Preset | null => {
      const row = p as Record<string, unknown>;
      const slug = str(row.slug) || str(row.id);
      return slug
        ? { slug, name: str(row.name), description: str(row.description), model: str(row.model) }
        : null;
    })
    .filter((p): p is Preset => p !== null);
}

export async function getByokProviders(): Promise<ByokProvider[]> {
  const data = await req<Record<string, unknown>>("/v1/byok/providers");
  const list = data?.providers ?? data?.data;
  if (!Array.isArray(list)) return [];
  return list
    .map((p): ByokProvider | null => {
      const row = p as Record<string, unknown>;
      const id = str(row.id);
      if (!id) return null;
      return {
        id,
        name: str(row.name) || id,
        key_placeholder: str(row.key_placeholder ?? row.keyPlaceholder),
        key_hint: str(row.key_hint ?? row.keyHint),
        supports_base_url: Boolean(row.supports_base_url ?? row.supportsBaseUrl),
        default_base_url: str(row.default_base_url ?? row.defaultBaseUrl),
        get_key_url: str(row.get_key_url ?? row.getKeyUrl),
        docs_url: str(row.docs_url ?? row.docsUrl),
        free_tier: Boolean(row.free_tier ?? row.freeTier),
      };
    })
    .filter((p): p is ByokProvider => p !== null);
}

export async function getByokKeys(): Promise<ByokKey[]> {
  const data = await req<Record<string, unknown>>("/v1/byok");
  const list = data?.keys ?? data?.data;
  if (!Array.isArray(list)) return [];
  return list
    .map((k): ByokKey | null => {
      const row = k as Record<string, unknown>;
      const id = str(row.id);
      const provider = str(row.provider);
      if (!id || !provider) return null;
      return {
        id,
        provider,
        key_preview: str(row.key_preview ?? row.keyPreview),
        enabled: row.enabled !== false,
        base_url: str(row.base_url ?? row.baseUrl),
        created_at: num(row.created_at ?? row.createdAt),
      };
    })
    .filter((k): k is ByokKey => k !== null);
}

export async function testByokKey(body: {
  provider: string;
  api_key: string;
  base_url?: string;
}): Promise<ByokTestResult> {
  const data = await req<Record<string, unknown>>("/v1/byok/test", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return {
    ok: Boolean(data?.ok ?? data?.valid ?? data?.success),
    error: str(data?.error),
    message: str(data?.message),
    models: num(data?.models),
    latency_ms: num(data?.latency_ms),
  };
}

export async function createByokKey(body: {
  provider: string;
  api_key: string;
  base_url?: string;
}): Promise<void> {
  await req("/v1/byok", { method: "POST", body: JSON.stringify(body) });
}

export async function updateByokKey(
  id: string,
  body: { enabled?: boolean },
): Promise<void> {
  await req(`/v1/byok/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function deleteByokKey(id: string): Promise<void> {
  await req(`/v1/byok/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function listPlugins(): Promise<Plugin[]> {
  const data = await req<{ plugins?: Plugin[] }>("/v1/plugins/");
  return data?.plugins ?? [];
}

/** Runs `git clone` on the user's machine against `url`. There is no allowlist. */
export async function installPlugin(url: string, name?: string): Promise<Plugin> {
  return req<Plugin>("/v1/plugins/install", {
    method: "POST",
    body: JSON.stringify(name ? { url, name } : { url }),
  });
}

export async function uninstallPlugin(name: string): Promise<boolean> {
  const data = await req<{ ok?: boolean }>(`/v1/plugins/${encodeURIComponent(name)}`, {
    method: "DELETE",
  });
  return Boolean(data?.ok);
}

export async function getPluginSkills(name: string): Promise<string[]> {
  const data = await req<{ skills?: string[] }>(
    `/v1/plugins/${encodeURIComponent(name)}/skills`,
  );
  return data?.skills ?? [];
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
