import { useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { RightRail } from "./components/RightRail";
import { useRoute } from "./hooks/useRoute";
import { useSession } from "./hooks/useSession";
import { useSessionStream } from "./hooks/useSessionStream";
import { useSettings } from "./hooks/useSettings";
import { Chat } from "./views/Chat";
import { Plugins } from "./views/Plugins";
import { SettingsRoute } from "./views/Settings/SettingsRoute";

export function App() {
  const { route, navigate } = useRoute();
  const [showRightRail, setShowRightRail] = useState(true);
  const settings = useSettings();
  const stream = useSessionStream();
  const session = useSession({
    settings,
    onOpenSession: stream.openSession,
    onOpenNewSession: stream.openNewSession,
    onError: stream.addItem,
  });

  const handleWorkspaceSet = () => {
    const p = settings.workspaceInput.trim();
    if (p) {
      settings.setWorkspace(p);
      void session.refreshSessions(p);
    }
  };

  return (
    <div className="flex h-full min-h-0 bg-background text-foreground">
      <Sidebar
        workspace={settings.workspace}
        workspaceInput={settings.workspaceInput}
        onWorkspaceInputChange={settings.setWorkspaceInput}
        onWorkspaceSet={handleWorkspaceSet}
        sessions={session.sessions}
        sessionId={session.sessionId}
        onSelectSession={session.selectSession}
        onCreateSession={session.createSession}
        onOpenSettings={() => navigate(route === "settings" ? "chat" : "settings")}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        {route === "settings" ? (
          <SettingsRoute settings={settings} onDone={() => navigate("chat")} />
        ) : route === "plugins" ? (
          <Plugins />
        ) : (
          <Chat
            chatTitle={session.chatTitle}
            sessionId={session.sessionId}
            workspace={settings.workspace}
            provider={settings.provider}
            model={settings.model}
            items={stream.items}
            busy={stream.busy}
            showTemplates={session.showTemplates}
            onHideTemplates={session.hideTemplates}
            onSend={stream.sendUserMessage}
            onInterrupt={stream.interrupt}
            onApprove={stream.approve}
            showRightRail={showRightRail}
            onToggleRightRail={() => setShowRightRail((v) => !v)}
          />
        )}
      </main>

      {showRightRail && route === "chat" && (
        <RightRail
          artifacts={stream.artifacts}
          provider={settings.provider}
          model={settings.model}
        />
      )}
    </div>
  );
}
