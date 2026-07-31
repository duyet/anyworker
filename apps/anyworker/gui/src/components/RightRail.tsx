import { useState } from "react";
import { getWorkspaceTree, type TreeEntry } from "../api";
import { AccessPanel } from "./AccessPanel";
import { FilePreviewDialog } from "./FilePreviewDialog";
import { WorkspaceTree } from "./WorkspaceTree";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileCode, History } from "lucide-react";

function findByName(entries: TreeEntry[], name: string): string | null {
  for (const entry of entries) {
    if (entry.kind === "file" && entry.name === name) return entry.path;
    const hit = entry.children ? findByName(entry.children, name) : null;
    if (hit) return hit;
  }
  return null;
}

export function RightRail({
  artifacts,
  provider,
  model,
  workspace,
  onOpenHistory,
}: {
  artifacts: Array<{ name: string; kind: string; content: string }>;
  provider: string;
  model: string;
  workspace: string;
  onOpenHistory: () => void;
}) {
  const [previewPath, setPreviewPath] = useState<string | null>(null);
  const [artifactError, setArtifactError] = useState<string | null>(null);

  // Artifacts arrive from the event stream as a file name only, so resolve it
  // against the tree before asking the server to read it.
  const openArtifact = async (name: string) => {
    setArtifactError(null);
    try {
      const tree = await getWorkspaceTree(".", 5);
      const path = findByName(tree.entries ?? [], name);
      if (!path) {
        setArtifactError(`Cannot find ${name} in this workspace.`);
        return;
      }
      setPreviewPath(path);
    } catch (e: unknown) {
      setArtifactError(e instanceof Error ? e.message : "Could not open it.");
    }
  };

  return (
    <aside className="flex w-64 shrink-0 flex-col border-l border-border bg-surface">
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {/* Model info */}
          <div>
            <h3 className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium mb-2">
              Active model
            </h3>
            <Card className="p-3">
              <div className="text-sm font-medium">{model || "No model"}</div>
              <div className="text-[11px] text-muted-foreground">
                {provider === "cas" ? "Full agent" : "Compat mode"}
              </div>
            </Card>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-xs"
            onClick={onOpenHistory}
          >
            <History className="size-3.5" />
            See what it did
          </Button>

          {/* Artifacts */}
          <div>
            <h3 className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium mb-2">
              Artifacts
            </h3>
            {artifacts.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">
                No files produced yet.
              </p>
            ) : (
              <div className="space-y-1.5">
                {artifacts.map((a, i) => (
                  <button
                    key={`${a.name}-${i}`}
                    type="button"
                    onClick={() => void openArtifact(a.name)}
                    className="flex w-full items-center gap-2 rounded-md border border-border bg-surface-muted px-2.5 py-2 text-left hover:bg-surface transition-colors"
                  >
                    <FileCode className="size-3.5 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <div className="truncate text-xs font-medium">{a.name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        Open to preview
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {artifactError && (
              <p className="mt-1.5 text-[11px] text-destructive">{artifactError}</p>
            )}
          </div>

          {/* Files */}
          <div>
            <h3 className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium mb-2">
              Files
            </h3>
            <WorkspaceTree workspace={workspace} onOpenFile={setPreviewPath} />
          </div>

          {/* Access */}
          <div>
            <h3 className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium mb-2">
              Access
            </h3>
            <AccessPanel workspace={workspace} />
          </div>
        </div>
      </ScrollArea>

      <FilePreviewDialog path={previewPath} onClose={() => setPreviewPath(null)} />
    </aside>
  );
}
