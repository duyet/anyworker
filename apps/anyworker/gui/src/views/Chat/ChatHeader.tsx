import { Button } from "@/components/ui/button";
import { MessageSquare, PanelRight } from "lucide-react";
import type { ConnectionState } from "@/hooks/useSessionStream";

const CONNECTION_LABEL: Record<ConnectionState, string> = {
  connected: "Connected",
  reconnecting: "Reconnecting…",
  offline: "Offline",
};

function ConnectionBadge({ state }: { state: ConnectionState }) {
  if (state === "connected") return null;
  return (
    <span
      className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
      role="status"
    >
      <span
        className={`size-1.5 rounded-full ${
          state === "reconnecting" ? "bg-amber-500 animate-pulse" : "bg-muted-foreground"
        }`}
      />
      {CONNECTION_LABEL[state]}
    </span>
  );
}

export function ChatHeader({
  chatTitle,
  sessionId,
  workspace,
  provider,
  model,
  busy,
  connectionState,
  onInterrupt,
  showRightRail,
  onToggleRightRail,
}: {
  chatTitle: string;
  sessionId: string | null;
  workspace: string;
  provider: string;
  model: string;
  busy: boolean;
  connectionState?: ConnectionState;
  onInterrupt: () => void;
  showRightRail: boolean;
  onToggleRightRail: () => void;
}) {
  return (
    <header className="border-b border-border px-4 py-3 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <div>
          <div className="text-sm font-medium flex items-center gap-2">
            <MessageSquare className="size-3.5 text-muted-foreground" />
            {chatTitle || (sessionId ? "Session" : "No session selected")}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {workspace || "No workspace"} · {provider}{model ? ` / ${model}` : ""}
          </div>
        </div>
      </div>
      <div className="flex gap-2 items-center">
        {connectionState && <ConnectionBadge state={connectionState} />}
        {busy && (
          <Button
            variant="ghost"
            size="sm"
            className="text-[11px] h-7 text-destructive"
            onClick={onInterrupt}
          >
            Stop
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={onToggleRightRail}
          aria-label={showRightRail ? "Hide panel" : "Show panel"}
        >
          <PanelRight className="size-4" />
        </Button>
      </div>
    </header>
  );
}
