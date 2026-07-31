import { useCallback, useEffect, useState } from "react";
import {
  getProviders,
  getSettings,
  setActive,
  setProviderProfile,
  type Provider,
} from "../api";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

/** Provider, model, credentials and workspace for the active profile. */
export function useSettings() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [provider, setProvider] = useState("anyrouter");
  const [model, setModel] = useState("anyrouter/cowork");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [workspace, setWorkspace] = useState("");
  const [workspaceInput, setWorkspaceInput] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    getProviders()
      .then((list) => {
        setProviders(list);
        // Try to load saved settings
        getSettings()
          .then((settings) => {
            const active = settings.active;
            if (active.provider) setProvider(active.provider);
            if (active.model) setModel(active.model);
            if (active.workspace) {
              setWorkspace(active.workspace);
              setWorkspaceInput(active.workspace);
            }
          })
          .catch(() => {
            /* use defaults */
          });
      })
      .catch(() => {
        /* use defaults */
      });
  }, []);

  /** Adopt the provider/model/workspace stored on a session. */
  const adoptSession = useCallback(
    (s: { provider: string; model: string; workspace?: string | null }) => {
      setWorkspace(s.workspace || "");
      setWorkspaceInput(s.workspace || "");
      setProvider(s.provider);
      setModel(s.model);
    },
    [],
  );

  /** Persists provider/model/credentials. Returns true on success. */
  const save = useCallback(async (): Promise<boolean> => {
    setSaveStatus("saving");
    setSaveError(null);
    try {
      // Only touch the stored credentials when the user actually typed
      // something — blank fields mean "keep what's already saved".
      if (apiKey.trim() || baseUrl.trim()) {
        await setProviderProfile(provider, {
          api_key: apiKey.trim(),
          base_url: baseUrl.trim(),
        });
      }
      await setActive({ provider, model, workspace: workspace || workspaceInput });
      setApiKey("");
      setSaveStatus("saved");
      return true;
    } catch (e) {
      setSaveStatus("error");
      setSaveError(
        e instanceof Error ? e.message : "Could not save your settings.",
      );
      return false;
    }
  }, [provider, model, workspace, workspaceInput, apiKey, baseUrl]);

  return {
    providers,
    provider,
    setProvider,
    model,
    setModel,
    apiKey,
    setApiKey,
    baseUrl,
    setBaseUrl,
    workspace,
    setWorkspace,
    workspaceInput,
    setWorkspaceInput,
    adoptSession,
    save,
    saveStatus,
    saveError,
  };
}

export type SettingsState = ReturnType<typeof useSettings>;
