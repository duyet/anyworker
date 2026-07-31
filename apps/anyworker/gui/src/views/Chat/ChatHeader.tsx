import { Button } from "@/components/ui/button";
import { MessageSquare, PanelRight } from "lucide-react";

export function ChatHeader({
  chatTitle,
  sessionId,
  workspace,
  provider,
  model,
  busy,
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
