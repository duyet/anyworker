import { useCallback, useEffect, useState } from "react";
import { getRecentWorkspaces, openWorkspace, type RecentWorkspace } from "../api";
import { pickDirectory, pickerKind } from "../lib/directoryPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { FolderOpen, Loader2 } from "lucide-react";

const parentOf = (path: string) => {
  const cut = path.replace(/\/+$/, "").lastIndexOf("/");
  return cut > 0 ? path.slice(0, cut) : "/";
};

function groupByParent(list: RecentWorkspace[]) {
  const groups = new Map<string, RecentWorkspace[]>();
  for (const w of list) {
    const key = parentOf(w.path);
    const bucket = groups.get(key);
    if (bucket) bucket.push(w);
    else groups.set(key, [w]);
  }
  return [...groups.entries()];
}

/**
 * Picks the folder the agent works in. Uses the native dialog under Tauri,
 * the File System Access API in the browser, and the text field otherwise.
 */
export function WorkspacePicker({
  value,
  onChange,
  onCommit,
}: {
  value: string;
  onChange: (v: string) => void;
  onCommit: () => void;
}) {
  const [recent, setRecent] = useState<RecentWorkspace[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const kind = pickerKind();

  const loadRecent = useCallback(() => {
    getRecentWorkspaces()
      .then(setRecent)
      .catch(() => setRecent([]));
  }, []);

  useEffect(loadRecent, [loadRecent]);

  // The parent owns the input value, so commit only once it has caught up.
  useEffect(() => {
    if (pending && value === pending) {
      setPending(null);
      onCommit();
    }
  }, [pending, value, onCommit]);

  const open = useCallback(
    async (path: string) => {
      const target = path.trim();
      if (!target) return;
      setBusy(true);
      setError(null);
      setNote(null);
      try {
        const res = await openWorkspace(target);
        if (!res.ok) {
          setError(res.error || `Could not open ${target}`);
          return;
        }
        const resolved = res.path || target;
        onChange(resolved);
        setPending(resolved);
        loadRecent();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not reach the server");
      } finally {
        setBusy(false);
      }
    },
    [loadRecent, onChange],
  );

  const browse = async () => {
    setError(null);
    setNote(null);
    try {
      const picked = await pickDirectory();
      if (!picked) return;
      if (picked.exact) {
        await open(picked.path);
        return;
      }
      // Browser picker: we got a name, not a path. Say so instead of guessing.
      onChange(picked.path);
      setNote(
        `Your browser gives the folder name only. Finish the full path to “${picked.path}” and press Enter.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "The folder picker failed");
    }
  };

  const groups = groupByParent(recent);

  return (
    <div className="space-y-2 border-b border-border p-3">
      <label className="block text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
        Workspace
      </label>
      <div className="flex gap-1.5">
        <Input
          className="h-8 text-xs"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="/path/to/project"
          aria-label="Full path to the workspace folder"
          onKeyDown={(e) => {
            if (e.key === "Enter") void open(value);
          }}
        />
        {kind === "none" ? null : (
          <Tooltip>
            <TooltipTrigger>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                aria-label="Open folder"
                disabled={busy}
                onClick={browse}
              >
                {busy ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <FolderOpen className="size-3.5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {kind === "tauri" ? "Open folder" : "Choose folder in your browser"}
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {kind === "none" ? (
        <p className="text-[10px] text-muted-foreground">
          No folder picker here. Type the full path and press Enter.
        </p>
      ) : null}

      {note ? (
        <p className="rounded-md bg-surface-muted px-2 py-1.5 text-[10px] text-muted-foreground">
          {note}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-md border border-danger/40 bg-danger/10 px-2 py-1.5 text-[10px] text-danger">
          {error}
        </p>
      ) : null}

      {groups.length > 0 ? (
        <div className="space-y-1.5 pt-1">
          <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
            Recent
          </span>
          {groups.map(([parent, items]) => (
            <div key={parent} className="space-y-0.5">
              <span className="block truncate text-[10px] text-muted-foreground/70 font-mono">
                {parent}
              </span>
              {items.map((w) => (
                <button
                  key={w.path}
                  type="button"
                  disabled={busy}
                  onClick={() => void open(w.path)}
                  title={w.path}
                  className={cn(
                    "w-full truncate rounded-md px-2 py-1 text-left text-xs hover:bg-surface-muted transition-colors",
                    value === w.path ? "bg-surface-muted" : "",
                    w.exists ? "" : "text-muted-foreground line-through",
                  )}
                >
                  {w.name || w.path}
                </button>
              ))}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
