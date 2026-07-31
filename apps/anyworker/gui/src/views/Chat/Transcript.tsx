import { useEffect, useRef } from "react";
import { ChatRow } from "@/components/ChatRow";
import { UseCasePicker } from "@/components/UseCasePicker";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles } from "lucide-react";
import type { ChatItem, UseCaseTemplate } from "@/types";
import { USE_CASE_TEMPLATES } from "@/types";

export function Transcript({
  items,
  busy,
  sessionId,
  showTemplates,
  onPickTemplate,
  onApprove,
}: {
  items: ChatItem[];
  busy: boolean;
  sessionId: string | null;
  showTemplates: boolean;
  onPickTemplate: (t: UseCaseTemplate) => void;
  onApprove: (approvalId: string, outcome: "once" | "always_tool" | "deny") => void;
}) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [items]);

  return (
    <ScrollArea className="flex-1 overflow-y-auto">
      <div className="min-h-full flex flex-col">
        {showTemplates && !sessionId ? (
          <div className="flex-1 flex items-center justify-center">
            <UseCasePicker templates={USE_CASE_TEMPLATES} onPick={onPickTemplate} />
          </div>
        ) : showTemplates && items.length === 0 ? (
          <UseCasePicker templates={USE_CASE_TEMPLATES} onPick={onPickTemplate} />
        ) : items.length === 0 && !busy ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md">
              <Sparkles className="size-8 text-brand/50 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Ask for an outcome — a memo, a summary, a fix…
              </p>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto w-full p-4 space-y-4 flex-1">
            {items.map((it, i) => (
              <ChatRow key={i} item={it} onApprove={onApprove} />
            ))}
            {busy && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground pl-4">
                <span className="size-1.5 rounded-full bg-muted-foreground animate-pulse" />
                <span className="size-1.5 rounded-full bg-muted-foreground animate-pulse" style={{ animationDelay: "0.15s" }} />
                <span className="size-1.5 rounded-full bg-muted-foreground animate-pulse" style={{ animationDelay: "0.3s" }} />
                Working…
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
