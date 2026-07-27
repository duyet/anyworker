import { useCallback, useEffect, useState } from "react";
import {
  createByokKey,
  deleteByokKey,
  getByokKeys,
  getByokProviders,
  testByokKey,
  updateByokKey,
  type ByokKey,
  type ByokProvider,
  type ByokTestResult,
} from "../../api";
import { cn } from "../../lib/utils";

function AddKeyDialog({
  provider,
  onClose,
  onSaved,
}: {
  provider: ByokProvider;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [key, setKey] = useState("");
  const [baseUrl, setBaseUrl] = useState(provider.default_base_url ?? "");
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<ByokTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const body = () => ({
    provider: provider.id,
    api_key: key.trim(),
    ...(provider.supports_base_url && baseUrl.trim() ? { base_url: baseUrl.trim() } : {}),
  });

  const test = async () => {
    setTesting(true);
    setError(null);
    setResult(null);
    try {
      setResult(await testByokKey(body()));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not check the key.");
    } finally {
      setTesting(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await createByokKey(body());
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the key.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-background/80 p-4">
      <div className="w-full max-w-md space-y-3 rounded-xl border border-border bg-surface p-4">
        <div className="flex items-start justify-between">
          <h3 className="text-sm font-semibold">Add your {provider.name} key</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Close
          </button>
        </div>

        {provider.key_hint ? (
          <p className="text-xs text-muted-foreground">{provider.key_hint}</p>
        ) : null}
        {provider.get_key_url ? (
          <a
            href={provider.get_key_url}
            target="_blank"
            rel="noreferrer"
            className="block text-xs text-muted-foreground underline underline-offset-2"
          >
            Get a {provider.name} key
          </a>
        ) : null}

        <label className="block text-xs text-muted-foreground">API key</label>
        <input
          type="password"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          value={key}
          onChange={(e) => {
            setKey(e.target.value);
            setResult(null);
          }}
          placeholder={provider.key_placeholder ?? "paste your key"}
        />

        {provider.supports_base_url ? (
          <>
            <label className="block text-xs text-muted-foreground">Base URL</label>
            <input
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="optional"
            />
          </>
        ) : null}

        {result ? (
          <div
            className={cn(
              "rounded-md border px-3 py-2 text-xs",
              result.ok
                ? "border-ok/40 bg-ok/10 text-ok"
                : "border-danger/40 bg-danger/10 text-danger",
            )}
          >
            {result.ok
              ? result.message || "The key works. You can save it now."
              : result.error || result.message || "The key did not work."}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
            {error}
          </div>
        ) : null}

        <div className="flex gap-2">
          <button
            type="button"
            disabled={!key.trim() || testing}
            onClick={test}
            className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-surface-muted disabled:opacity-40"
          >
            {testing ? "Checking…" : "Check key"}
          </button>
          <button
            type="button"
            disabled={!result?.ok || saving}
            onClick={save}
            className="rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-brand-foreground disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save key"}
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Check the key before you save it. AnyWorker never stores it on this computer.
        </p>
      </div>
    </div>
  );
}

export function Byok({ canManage }: { canManage: boolean }) {
  const [providers, setProviders] = useState<ByokProvider[]>([]);
  const [providersError, setProvidersError] = useState<string | null>(null);
  const [keys, setKeys] = useState<ByokKey[]>([]);
  const [keysError, setKeysError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<ByokProvider | null>(null);
  const [query, setQuery] = useState("");

  const loadKeys = useCallback(async () => {
    if (!canManage) return;
    try {
      setKeys(await getByokKeys());
      setKeysError(null);
    } catch (e) {
      setKeysError(e instanceof Error ? e.message : "Could not load your keys.");
    }
  }, [canManage]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const list = await getByokProviders();
        if (!cancelled) {
          setProviders(list);
          setProvidersError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setProvidersError(
            e instanceof Error ? e.message : "Could not load the provider list.",
          );
        }
      }
      await loadKeys();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadKeys]);

  const toggle = async (k: ByokKey) => {
    try {
      await updateByokKey(k.id, { enabled: !k.enabled });
      await loadKeys();
    } catch (e) {
      setKeysError(e instanceof Error ? e.message : "Could not update the key.");
    }
  };

  const remove = async (k: ByokKey) => {
    try {
      await deleteByokKey(k.id);
      await loadKeys();
    } catch (e) {
      setKeysError(e instanceof Error ? e.message : "Could not delete the key.");
    }
  };

  const q = query.trim().toLowerCase();
  const shown = q
    ? providers.filter(
        (p) => p.id.toLowerCase().includes(q) || p.name.toLowerCase().includes(q),
      )
    : providers;

  const nameOf = (id: string) => providers.find((p) => p.id === id)?.name || id;

  return (
    <div className="max-w-xl space-y-4">
      <p className="text-xs text-muted-foreground">
        Add keys you already have. AnyRouter stores them for you and uses them for that
        provider.
      </p>

      {!canManage ? (
        <div className="rounded-md border border-border bg-surface-muted px-3 py-2 text-xs text-muted-foreground">
          Sign in and grant the management permission to add provider keys.
        </div>
      ) : null}

      <section className="space-y-1.5">
        <h3 className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Your keys
        </h3>
        {keysError ? (
          <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
            {keysError}
          </div>
        ) : null}
        {loading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : keys.length === 0 ? (
          <p className="text-xs text-muted-foreground">No provider keys yet.</p>
        ) : (
          keys.map((k) => (
            <div
              key={k.id}
              className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{nameOf(k.provider)}</div>
                <div className="truncate font-mono text-[11px] text-muted-foreground">
                  {k.key_preview || "hidden"} · {k.enabled ? "On" : "Off"}
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => toggle(k)}
                  className="rounded-md border border-border px-2 py-1 text-xs hover:bg-surface-muted"
                >
                  {k.enabled ? "Disable" : "Enable"}
                </button>
                <button
                  type="button"
                  onClick={() => remove(k)}
                  className="rounded-md border border-danger/40 px-2 py-1 text-xs text-danger"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      <section className="space-y-1.5">
        <h3 className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Providers
        </h3>
        {providersError ? (
          <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
            {providersError}
          </div>
        ) : null}
        <input
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search providers"
        />
        {shown.length === 0 ? (
          <p className="text-xs text-muted-foreground">No provider matches that search.</p>
        ) : (
          <div className="grid max-h-72 grid-cols-2 gap-1.5 overflow-y-auto">
            {shown.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={!canManage}
                onClick={() => setAdding(p)}
                className="rounded-md border border-border bg-surface px-3 py-2 text-left hover:bg-surface-muted disabled:opacity-40"
              >
                <div className="truncate text-sm font-medium">{p.name}</div>
                <div className="truncate text-[11px] text-muted-foreground">
                  {p.free_tier ? "Has a free tier" : p.id}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {adding ? (
        <AddKeyDialog
          provider={adding}
          onClose={() => setAdding(null)}
          onSaved={loadKeys}
        />
      ) : null}
    </div>
  );
}
