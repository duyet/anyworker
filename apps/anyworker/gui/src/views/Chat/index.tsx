import { useCallback, useRef, useState } from "react";
import type { ChatItem, UseCaseTemplate } from "@/types";
import { ChatHeader } from "./ChatHeader";
import { Transcript } from "./Transcript";
import { Composer } from "./Composer";

export function Chat({
  chatTitle,
  sessionId,
  workspace,
  provider,
  model,
  items,
  busy,
  showTemplates,
  onHideTemplates,
  onSend,
  onInterrupt,
  onApprove,
  showRightRail,
  onToggleRightRail,
}: {
  chatTitle: string;
  sessionId: string | null;
  workspace: string;
  provider: string;
  model: string;
  items: ChatItem[];
  busy: boolean;
  showTemplates: boolean;
  onHideTemplates: () => void;
  onSend: (text: string) => void;
  onInterrupt: () => void;
  onApprove: (approvalId: string, outcome: "once" | "always_tool" | "deny") => void;
  showRightRail: boolean;
  onToggleRightRail: () => void;
}) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const handleSend = useCallback(() => {
    const text = draft.trim();
    if (!text || busy || !sessionId) return;

    if (showTemplates) onHideTemplates();

    setDraft("");
    onSend(text);
  }, [draft, busy, sessionId, showTemplates, onHideTemplates, onSend]);

  const handlePickTemplate = useCallback(
    (t: UseCaseTemplate) => {
      setDraft(t.prompt);
      onHideTemplates();
      setTimeout(() => inputRef.current?.focus(), 100);
    },
    [onHideTemplates],
  );

  return (
    <>
      <ChatHeader
        chatTitle={chatTitle}
        sessionId={sessionId}
        workspace={workspace}
        provider={provider}
        model={model}
        busy={busy}
        onInterrupt={onInterrupt}
        showRightRail={showRightRail}
        onToggleRightRail={onToggleRightRail}
      />
      <Transcript
        items={items}
        busy={busy}
        sessionId={sessionId}
        showTemplates={showTemplates}
        onPickTemplate={handlePickTemplate}
        onApprove={onApprove}
      />
      <Composer
        inputRef={inputRef}
        draft={draft}
        onDraftChange={setDraft}
        onSend={handleSend}
        sessionId={sessionId}
        busy={busy}
      />
    </>
  );
}
