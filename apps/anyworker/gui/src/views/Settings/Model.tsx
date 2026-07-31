import { useMemo, useState } from "react";
import type { ModelCatalog, ModelInfo, Provider, TopModel } from "../../api";
import type { SaveStatus } from "../../hooks/useSettings";
import { cn } from "../../lib/utils";

const FALLBACK_RECOMMENDED = ["anyrouter/cowork", "anyrouter/free"];

function price(model: ModelInfo): string | null {
  if (model.prompt_price === null || model.prompt_price === undefined) return null;
  if (model.prompt_price === 0) return "Free";
  return `$${model.prompt_price.toFixed(2)} / M in`;
}

function context(model: ModelInfo): string | null {
  if (!model.context_length) return null;
  return `${Math.round(model.context_length / 1000)}K context`;
}

function ModelRow({
  model,
  selected,
  onPick,
  note,
}: {
  model: ModelInfo;
  selected: boolean;
  onPick: (id: string) => void;
  note?: string | null;
}) {
  const meta = [model.provider, context(model), price(model), note].filter(Boolean);
  return (
    <button
      type="button"
      onClick={() => onPick(model.id)}
      className={cn(
        "w-full rounded-md border border-border px-3 py-2 text-left hover:bg-surface-muted",
        selected && "border-brand/60 bg-surface-muted",
      )}
    >
      <div className="truncate text-sm font-medium">{model.name || model.id}</div>
      <div className="truncate text-[11px] text-muted-foreground">{model.id}</div>
      {meta.length ? (
        <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {meta.join(" · ")}
        </div>
      ) : null}
    </button>
  );
}

export function ModelSettings({
  providers,
  provider,
  onProviderChange,
  model,
  onModelChange,
  apiKey,
  onApiKeyChange,
  baseUrl,
  onBaseUrlChange,
  catalog,
  catalogError,
  catalogLoading,
  saveStatus,
  saveError,
  onSave,
}: {
  providers: Provider[];
  provider: string;
  onProviderChange: (name: string) => void;
  model: string;
  onModelChange: (id: string) => void;
  apiKey: string;
  onApiKeyChange: (v: string) => void;
  baseUrl: string;
  onBaseUrlChange: (v: string) => void;
  catalog: ModelCatalog | null;
  catalogError: string | null;
  catalogLoading: boolean;
  saveStatus: SaveStatus;
  saveError: string | null;
  onSave: () => void;
}) {
  const [query, setQuery] = useState("");
  const activeProvider = providers.find((p) => p.name === provider);

  const byId = useMemo(() => {
    const map = new Map<string, ModelInfo>();
    for (const m of catalog?.models ?? []) map.set(m.id, m);
    return map;
  }, [catalog]);

  const recommended = useMemo(() => {
    const ids = catalog?.recommended?.length
      ? catalog.recommended
      : FALLBACK_RECOMMENDED;
    return ids.map((id) => byId.get(id) ?? { id });
  }, [catalog, byId]);

  const top: TopModel[] = (catalog?.top ?? []).slice(0, 8);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = catalog?.models ?? [];
    const list = q
      ? all.filter(
          (m) =>
            m.id.toLowerCase().includes(q) ||
            (m.name ?? "").toLowerCase().includes(q),
        )
      : all;
    return list.slice(0, 60);
  }, [catalog, query]);

  return (
    <div className="max-w-xl space-y-3">
      <label className="block text-xs text-muted-foreground">Provider</label>
      <select
        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
        value={provider}
        onChange={(e) => onProviderChange(e.target.value)}
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
      <div className="rounded-md border border-border bg-surface px-3 py-2 text-sm">
        {model || "No model picked yet"}
      </div>

      {catalogError ? (
        <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
          {catalogError} Type a model id below instead.
        </div>
      ) : null}
      {catalogLoading ? (
        <p className="text-xs text-muted-foreground">Loading models…</p>
      ) : null}

      <section className="space-y-1.5">
        <h3 className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Recommended
        </h3>
        {recommended.map((m) => (
          <ModelRow
            key={m.id}
            model={m}
            selected={m.id === model}
            onPick={onModelChange}
          />
        ))}
      </section>

      {top.length ? (
        <section className="space-y-1.5">
          <h3 className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Top this week
          </h3>
          {top.map((m) => (
            <ModelRow
              key={m.id}
              model={m}
              selected={m.id === model}
              onPick={onModelChange}
              note={m.requests ? `${m.requests.toLocaleString()} requests` : null}
            />
          ))}
        </section>
      ) : null}

      <section className="space-y-1.5">
        <h3 className="text-[11px] uppercase tracking-wide text-muted-foreground">
          All models
        </h3>
        <input
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search models"
        />
        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {catalog?.models.length ? "No model matches that search." : "No models to show."}
          </p>
        ) : (
          <div className="max-h-72 space-y-1.5 overflow-y-auto">
            {filtered.map((m) => (
              <ModelRow
                key={m.id}
                model={m}
                selected={m.id === model}
                onPick={onModelChange}
              />
            ))}
          </div>
        )}
      </section>

      <label className="block text-xs text-muted-foreground">Or type a model id</label>
      <input
        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
        value={model}
        onChange={(e) => onModelChange(e.target.value)}
        placeholder="model id"
      />

      <label className="block text-xs text-muted-foreground">API key</label>
      <input
        type="password"
        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
        value={apiKey}
        onChange={(e) => onApiKeyChange(e.target.value)}
        placeholder="leave blank to keep existing / env"
      />

      <label className="block text-xs text-muted-foreground">Base URL</label>
      <input
        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
        value={baseUrl}
        onChange={(e) => onBaseUrlChange(e.target.value)}
        placeholder="optional"
      />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={saveStatus === "saving"}
          className="rounded-md bg-brand px-3 py-2 text-sm font-medium text-brand-foreground disabled:opacity-60"
        >
          {saveStatus === "saving" ? "Saving…" : "Save"}
        </button>
        {saveStatus === "saved" ? (
          <span className="text-xs text-muted-foreground">Saved.</span>
        ) : null}
      </div>
      {saveStatus === "error" ? (
        <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
          {saveError || "Could not save your settings. Try again."}
        </div>
      ) : null}
    </div>
  );
}
