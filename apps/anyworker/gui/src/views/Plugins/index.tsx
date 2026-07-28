import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Puzzle,
  GitBranch,
  Plus,
  Trash2,
  ExternalLink,
  Download,
  CheckCircle2,
  Loader2,
} from "lucide-react";

type Plugin = {
  name: string;
  version: string;
  description: string;
  skills: string[];
  repository: string;
  install_path: string | null;
};

const INSTALL_URLS = [
  { url: "https://github.com/anyworker/skills-marketing", label: "Marketing skills" },
  { url: "https://github.com/anyworker/skills-finance", label: "Finance & banking" },
  { url: "https://github.com/anyworker/skills-data", label: "Data analysis" },
];

export function Plugins() {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [installUrl, setInstallUrl] = useState("");
  const [installing, setInstalling] = useState(false);
  const [installError, setInstallError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const loadPlugins = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("http://127.0.0.1:8765/v1/plugins/");
      const data = await res.json();
      setPlugins(data.plugins ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load plugins");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlugins();
  }, [loadPlugins]);

  const install = async () => {
    const url = installUrl.trim();
    if (!url) return;
    setInstalling(true);
    setInstallError(null);
    try {
      const res = await fetch("http://127.0.0.1:8765/v1/plugins/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || data.detail || "Install failed");
      }
      setInstallUrl("");
      await loadPlugins();
    } catch (e) {
      setInstallError(e instanceof Error ? e.message : "Install failed");
    } finally {
      setInstalling(false);
    }
  };

  const uninstall = async (name: string) => {
    try {
      await fetch(`http://127.0.0.1:8765/v1/plugins/${encodeURIComponent(name)}`, {
        method: "DELETE",
      });
      await loadPlugins();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Uninstall failed");
    }
  };

  const q = query.trim().toLowerCase();
  const shown = q
    ? plugins.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.skills.some((s) => s.toLowerCase().includes(q)),
      )
    : plugins;

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2 mb-1">
            <Puzzle className="size-5" />
            Skills & Plugins
          </h1>
          <p className="text-sm text-muted-foreground">
            Install skills from git repositories or browse curated sets.
          </p>
        </div>

        {/* Curated plugins */}
        <section className="space-y-2">
          <h2 className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
            Curated
          </h2>
          <div className="grid grid-cols-1 gap-2">
            {INSTALL_URLS.map((item) => (
              <button
                key={item.url}
                type="button"
                onClick={() => {
                  setInstallUrl(item.url);
                }}
                className="flex items-center gap-3 rounded-lg border border-border/60 bg-surface p-3 text-left hover:border-brand/30 hover:bg-surface-muted/50 transition-all"
              >
                <div className="rounded-lg bg-brand/10 p-2">
                  <Download className="size-4 text-brand" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{item.label}</div>
                  <div className="text-xs text-muted-foreground truncate font-mono">
                    {item.url}
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0">
                  Install
                </Badge>
              </button>
            ))}
          </div>
        </section>

        {/* Install from URL */}
        <section className="space-y-2">
          <h2 className="text-xs uppercase tracking-wide text-muted-foreground font-medium flex items-center gap-1.5">
            <GitBranch className="size-3" />
            Install from git URL
          </h2>
          <div className="flex gap-2">
            <Input
              className="flex-1 h-9 text-xs font-mono"
              value={installUrl}
              onChange={(e) => setInstallUrl(e.target.value)}
              placeholder="https://github.com/user/repo.git"
              onKeyDown={(e) => {
                if (e.key === "Enter") install();
              }}
            />
            <Button
              size="sm"
              className="h-9 shrink-0"
              disabled={!installUrl.trim() || installing}
              onClick={install}
            >
              {installing ? (
                <Loader2 className="size-3.5 animate-spin mr-1" />
              ) : (
                <Plus className="size-3.5 mr-1" />
              )}
              Install
            </Button>
          </div>
          {installError ? (
            <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
              {installError}
            </div>
          ) : null}
        </section>

        {/* Installed plugins */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
              Installed ({plugins.length})
            </h2>
            <Input
              className="w-48 h-8 text-xs"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search plugins…"
            />
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-8 justify-center">
              <Loader2 className="size-3.5 animate-spin" />
              Loading plugins…
            </div>
          ) : error ? (
            <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
              {error}
            </div>
          ) : shown.length === 0 ? (
            <div className="text-center py-8">
              <Puzzle className="size-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">
                {plugins.length === 0
                  ? "No plugins installed yet."
                  : "No plugins match your search."}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {shown.map((p) => (
                <Card key={p.name} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{p.name}</span>
                        <Badge variant="outline" className="text-[10px]">
                          v{p.version}
                        </Badge>
                        {p.skills.length > 0 ? (
                          <CheckCircle2 className="size-3 text-ok" />
                        ) : null}
                      </div>
                      {p.description ? (
                        <p className="text-xs text-muted-foreground mb-2">
                          {p.description}
                        </p>
                      ) : null}
                      {p.skills.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {p.skills.map((s) => (
                            <Badge
                              key={s}
                              variant="secondary"
                              className="text-[10px] font-mono"
                            >
                              {s}
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                      {p.repository ? (
                        <a
                          href={p.repository}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 mt-2 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="size-3" />
                          {p.repository}
                        </a>
                      ) : null}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 shrink-0 text-destructive hover:text-destructive"
                      onClick={() => uninstall(p.name)}
                      aria-label={`Uninstall ${p.name}`}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
