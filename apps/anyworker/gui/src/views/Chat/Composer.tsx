import type { RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

export function Composer({
  inputRef,
  draft,
  onDraftChange,
  onSend,
  sessionId,
  busy,
}: {
  inputRef: RefObject<HTMLTextAreaElement | null>;
  draft: string;
  onDraftChange: (v: string) => void;
  onSend: () => void;
  sessionId: string | null;
  busy: boolean;
}) {
  return (
    <div className="border-t border-border shrink-0">
      <div className="max-w-3xl mx-auto p-4">
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              className="min-h-[52px] max-h-[200px] w-full resize-none rounded-xl border border-input bg-background px-4 py-3 pr-12 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 placeholder:text-muted-foreground/60"
              placeholder={sessionId ? "Ask for an outcome — a memo, a summary, a fix…" : "Create a session to chat"}
              value={draft}
              disabled={!sessionId || busy}
              onChange={(e) => onDraftChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSend();
                }
              }}
            />
          </div>
          <Button
            size="icon"
            disabled={!sessionId || busy || !draft.trim()}
            onClick={onSend}
            className="size-[52px] shrink-0 rounded-xl"
          >
            <Send className="size-4" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground/50 text-center mt-2">
          AnyWorker uses the Claude Agent SDK and OpenAI-compatible tools. Tools run locally with your approval.
        </p>
      </div>
    </div>
  );
}
