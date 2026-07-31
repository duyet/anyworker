import { useCallback, useEffect, useState } from "react";
import { getWorkspaceTree, type TreeEntry } from "../api";
import { ChevronRight, ChevronDown, File, Folder } from "lucide-react";
import { cn } from "@/lib/utils";

type NodeState = {
  entries: TreeEntry[] | null;
  loading: boolean;
  error: string | null;
};

/**
 * Workspace files, one level at a time. A folder fetches its children the
 * first time you open it, so a deep tree never loads up front.
 */
export function WorkspaceTree({
  workspace,
  onOpenFile,
}: {
  workspace: string;
  onOpenFile: (path: string) => void;
}) {
  const [nodes, setNodes] = useState<Record<string, NodeState>>({});
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const load = useCallback(async (path: string) => {
    setNodes((prev) => ({
      ...prev,
      [path]: { entries: prev[path]?.entries ?? null, loading: true, error: null },
    }));
    try {
      const tree = await getWorkspaceTree(path, 1);
      setNodes((prev) => ({
        ...prev,
        [path]: { entries: tree.entries ?? [], loading: false, error: null },
      }));
    } catch (e: unknown) {
      setNodes((prev) => ({
        ...prev,
        [path]: {
          entries: null,
          loading: false,
          error: e instanceof Error ? e.message : "Could not read this folder.",
        },
      }));
    }
  }, []);

  useEffect(() => {
    setNodes({});
    setOpen({});
    if (workspace) void load(".");
  }, [workspace, load]);

  const toggle = (entry: TreeEntry) => {
    const next = !open[entry.path];
    setOpen((prev) => ({ ...prev, [entry.path]: next }));
    if (next && !nodes[entry.path]) void load(entry.path);
  };

  if (!workspace) {
    return (
      <p className="text-[11px] text-muted-foreground">
        Pick a workspace to see its files.
      </p>
    );
  }

  const renderLevel = (path: string, depth: number) => {
    const node = nodes[path];
    if (!node || (node.loading && !node.entries)) {
      return <p className="py-1 text-[11px] text-muted-foreground">Reading files…</p>;
    }
    if (node.error) {
      return (
        <div className="py-1">
          <p className="text-[11px] text-destructive">{node.error}</p>
          <button
            type="button"
            onClick={() => void load(path)}
            className="text-[11px] underline text-muted-foreground"
          >
            Try again
          </button>
        </div>
      );
    }
    const entries = node.entries ?? [];
    if (entries.length === 0) {
      return <p className="py-1 text-[11px] text-muted-foreground">This folder is empty.</p>;
    }
    return (
      <div className="space-y-px">
        {entries.map((entry) =>
          entry.kind === "dir" ? (
            <div key={entry.path}>
              <button
                type="button"
                onClick={() => toggle(entry)}
                aria-expanded={Boolean(open[entry.path])}
                style={{ paddingLeft: depth * 10 + 4 }}
                className="flex w-full items-center gap-1 rounded-md py-1 pr-2 text-left text-xs hover:bg-surface-muted transition-colors"
              >
                {open[entry.path] ? (
                  <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="size-3 shrink-0 text-muted-foreground" />
                )}
                <Folder className="size-3 shrink-0 text-muted-foreground" />
                <span className="truncate">{entry.name}</span>
              </button>
              {open[entry.path] && renderLevel(entry.path, depth + 1)}
            </div>
          ) : (
            <button
              key={entry.path}
              type="button"
              onClick={() => onOpenFile(entry.path)}
              style={{ paddingLeft: depth * 10 + 4 }}
              className={cn(
                "flex w-full items-center gap-1 rounded-md py-1 pr-2 text-left text-xs",
                "hover:bg-surface-muted transition-colors",
              )}
            >
              <span className="size-3 shrink-0" />
              <File className="size-3 shrink-0 text-muted-foreground" />
              <span className="truncate">{entry.name}</span>
            </button>
          ),
        )}
      </div>
    );
  };

  return renderLevel(".", 0);
}
