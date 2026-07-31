import type { SettingsState } from "@/hooks/useSettings";
import { Settings } from "./index";

/** Binds the settings hook to the Settings view for the `settings` route. */
export function SettingsRoute({
  settings,
  onDone,
}: {
  settings: SettingsState;
  onDone: () => void;
}) {
  return (
    <Settings
      providers={settings.providers}
      provider={settings.provider}
      onProviderChange={settings.setProvider}
      model={settings.model}
      onModelChange={settings.setModel}
      apiKey={settings.apiKey}
      onApiKeyChange={settings.setApiKey}
      baseUrl={settings.baseUrl}
      onBaseUrlChange={settings.setBaseUrl}
      onSave={() => {
        onDone();
        void settings.save();
      }}
    />
  );
}
