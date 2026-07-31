import { useCallback, useEffect, useState } from "react";
import { getProviders, getSettings, setActive, type Provider } from "../api";

/** Provider, model, credentials and workspace for the active profile. */
export function useSettings() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [provider, setProvider] = useState("anyrouter");
  const [model, setModel] = useState("anyrouter/cowork");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [workspace, setWorkspace] = useState("");
  const [workspaceInput, setWorkspaceInput] = useState("");

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

  const save = useCallback(async () => {
    setApiKey("");
    try {
      await setActive({ provider, model, workspace: workspace || workspaceInput });
    } catch {
      /* ignore */
    }
  }, [provider, model, workspace, workspaceInput]);

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
  };
}

export type SettingsState = ReturnType<typeof useSettings>;
