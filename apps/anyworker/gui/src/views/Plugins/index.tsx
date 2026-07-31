import { useCallback, useEffect, useState } from "react";
import {
  installPlugin,
  listPlugins,
  uninstallPlugin,
  type Plugin,
} from "../../api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Puzzle,
  GitBranch,
  Trash2,
  ExternalLink,
  CheckCircle2,
  Loader2,
  AlertTriangle,
} from "lucide-react";

export function Plugins() {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [installUrl, setInstallUrl] = useState("");
  const [confirmUrl, setConfirmUrl] = useState<string | null>(null);
  const [installing, setInstalling] = useState(false);
  const [installError, setInstallError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const loadPlugins = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPlugins(await listPlugins());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load plugins");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlugins();
  }, [loadPlugins]);

  const install = async (url: string) => {
    setInstalling(true);
    setInstallError(null);
    try {
      await installPlugin(url);
      setInstallUrl("");
      setConfirmUrl(null);
      await loadPlugins();
    } catch (e) {
      setInstallError(e instanceof Error ? e.message : "Install failed");
    } finally {
      setInstalling(false);
    }
  };

  const remove = async (name: string) => {
    setRemoving(name);
    setError(null);
    try {
      await uninstallPlugin(name);
      await loadPlugins();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Uninstall failed");
    } finally {
      setRemoving(null);
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
            Skills &amp; plugins
          </h1>
          <p className="text-sm text-muted-foreground">
            A plugin is a git repository of skills. AnyWorker clones it onto this
            computer and loads its skills into your sessions.
          </p>
        </div>

        {/* Install from URL */}
        <section className="space-y-2">
          <h2 className="text-xs uppercase tracking-wide text-muted-foreground font-medium flex items-center gap-1.5">
            <GitBranch className="size-3" />
            Install from a git URL
          </h2>

          <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2.5 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-medium text-danger">
              <AlertTriangle className="size-3.5" />
              Installing runs code from that URL on this computer
            </div>
            <p className="text-muted-foreground">
              AnyWorker runs <code className="font-mono">git clone</code> against any
              URL you give it. There is no allowlist and nothing is reviewed. The
              skills it installs can run commands with your account. Install only
              repositories you trust.
            </p>
          </div>

          <div className="flex gap-2">
            <Input
              className="flex-1 h-9 text-xs font-mono"
              value={installUrl}
              onChange={(e) => {
                setInstallUrl(e.target.value);
                setConfirmUrl(null);
              }}
              placeholder="https://github.com/user/repo.git"
              aria-label="Git URL to clone"
              onKeyDown={(e) => {
                if (e.key === "Enter" && installUrl.trim())
                  setConfirmUrl(installUrl.trim());
              }}
            />
            <Button
              size="sm"
              variant="outline"
              className="h-9 shrink-0"
              disabled={!installUrl.trim() || installing}
              onClick={() => setConfirmUrl(installUrl.trim())}
            >
              Review install
            </Button>
          </div>

          {confirmUrl ? (
            <div className="rounded-md border border-border bg-surface px-3 py-2.5 text-xs space-y-2">
              <p className="text-muted-foreground">This will run, as you:</p>
              <pre className="overflow-x-auto rounded bg-surface-muted px-2 py-1.5 font-mono text-[11px]">
                git clone --depth 1 {confirmUrl}
              </pre>
              <p className="text-muted-foreground">
                Into <code className="font-mono">~/.anyworker/plugins</code>. Any
                existing plugin folder with the same name is deleted first.
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="h-8"
                  disabled={installing}
                  onClick={() => void install(confirmUrl)}
                >
                  {installing ? (
                    <Loader2 className="size-3.5 animate-spin mr-1" />
                  ) : null}
                  {installing ? "Cloning…" : "Run it"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8"
                  disabled={installing}
                  onClick={() => setConfirmUrl(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}

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
              aria-label="Search installed plugins"
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
                  ? "No plugins installed. Paste a git URL above to add one."
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
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          No skills found in this plugin.
                        </p>
                      )}
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
                      disabled={removing === p.name}
                      onClick={() => void remove(p.name)}
                      aria-label={`Uninstall ${p.name}`}
                    >
                      {removing === p.name ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="size-3.5" />
                      )}
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
