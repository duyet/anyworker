import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Chat } from "./index";

// Chat renders Transcript/Composer which talk to the API for things like
// syntax highlighting or session lookups indirectly; keep this a pure smoke
// test that the view mounts and shows its header without throwing.
describe("Chat view smoke test", () => {
  it("renders the chat header and an empty transcript without crashing", () => {
    render(
      <Chat
        chatTitle="Untitled"
        sessionId="s1"
        workspace="/tmp/work"
        provider="anyrouter"
        model="anyrouter/cowork"
        items={[]}
        busy={false}
        connectionState="connected"
        showTemplates={false}
        onHideTemplates={() => {}}
        onSend={vi.fn()}
        onInterrupt={vi.fn()}
        onOpenHistory={vi.fn()}
        onApprove={vi.fn()}
        showRightRail={false}
        onToggleRightRail={() => {}}
      />,
    );

    expect(screen.getByText("Untitled")).toBeInTheDocument();
  });
});
