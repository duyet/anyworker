import { type SessionInfo } from "../api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  Plus,
  FolderOpen,
  Settings2,
  History,
  Bot,
} from "lucide-react";

export function Sidebar({
  workspace: _workspace,
  workspaceInput,
  onWorkspaceInputChange,
  onWorkspaceSet,
  sessions,
  sessionId,
  onSelectSession,
  onCreateSession,
  onOpenSettings,
}: {
  workspace: string;
  workspaceInput: string;
  onWorkspaceInputChange: (v: string) => void;
  onWorkspaceSet: () => void;
  sessions: SessionInfo[];
  sessionId: string | null;
  onSelectSession: (id: string) => void;
  onCreateSession: () => void;
  onOpenSettings: () => void;
}) {
  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-surface">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="text-sm font-semibold tracking-tight flex items-center gap-2">
          <Sparkles className="size-4 text-brand" />
          AnyWorker
        </div>
      </div>

      {/* Workspace */}
      <div className="space-y-2 border-b border-border p-3">
        <label className="block text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
          Workspace
        </label>
        <div className="flex gap-1.5">
          <Input
            className="h-8 text-xs"
            value={workspaceInput}
            onChange={(e) => onWorkspaceInputChange(e.target.value)}
            placeholder="/path/to/project"
            onKeyDown={(e) => { if (e.key === "Enter") onWorkspaceSet(); }}
          />
          <Tooltip>
            <TooltipTrigger>
              <Button variant="ghost" size="icon" className="size-8 shrink-0" aria-label="Open folder">
                <FolderOpen className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Open folder</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Sessions */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium flex items-center gap-1.5">
            <History className="size-3" />
            Sessions
          </span>
          <Tooltip>
            <TooltipTrigger>
              <Button variant="ghost" size="icon" className="size-6" onClick={onCreateSession}>
                <Plus className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>New session</TooltipContent>
          </Tooltip>
        </div>
        <div className="space-y-0.5 px-1.5">
          {sessions.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
              No sessions yet. Create one to start.
            </p>
          ) : (
            sessions.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onSelectSession(s.id)}
                className={cn(
                  "w-full rounded-md px-3 py-2.5 text-left hover:bg-surface-muted transition-colors",
                  sessionId === s.id ? "bg-surface-muted ring-1 ring-brand/30" : "",
                )}
              >
                <div className="flex items-center gap-2">
                  <Bot className="size-3.5 shrink-0 text-muted-foreground" />
                  <div className="truncate text-xs font-medium">{s.title}</div>
                </div>
                <div className="truncate text-[10px] text-muted-foreground pl-5.5">
                  <span className={cn(
                    "inline-block w-1.5 h-1.5 rounded-full mr-1",
                    s.harness === "cas" ? "bg-brand" : "bg-muted-foreground",
                  )} />
                  {s.harness === "cas" ? "Agent" : "Compat"} · {s.model || s.provider}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Sparkles className="size-3 text-brand" />
          <span className="text-[11px] text-muted-foreground">v0.1</span>
        </div>
        <Button variant="ghost" size="icon" className="size-7" onClick={onOpenSettings} aria-label="Settings">
          <Settings2 className="size-4" />
        </Button>
      </div>
    </aside>
  );
}
