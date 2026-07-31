import { useCallback, useEffect, useState } from "react";
import {
  getAnyRouterAccount,
  getModelCatalog,
  type AnyRouterAccount,
  type ModelCatalog,
  type Provider,
} from "../../api";
import type { SaveStatus } from "../../hooks/useSettings";
import { cn } from "../../lib/utils";
import { Account } from "./Account";
import { Byok } from "./Byok";
import { ModelSettings } from "./Model";

type Tab = "account" | "model" | "byok";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "account", label: "Account" },
  { id: "model", label: "Model" },
  { id: "byok", label: "Provider keys" },
];

export function Settings({
  providers,
  provider,
  onProviderChange,
  model,
  onModelChange,
  apiKey,
  onApiKeyChange,
  baseUrl,
  onBaseUrlChange,
  saveStatus,
  saveError,
  onSave,
}: {
  providers: Provider[];
  provider: string;
  onProviderChange: (name: string) => void;
  model: string;
  onModelChange: (id: string) => void;
  apiKey: string;
  onApiKeyChange: (v: string) => void;
  baseUrl: string;
  onBaseUrlChange: (v: string) => void;
  saveStatus: SaveStatus;
  saveError: string | null;
  onSave: () => void;
}) {
  const [tab, setTab] = useState<Tab>("account");
  const [account, setAccount] = useState<AnyRouterAccount | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [accountLoading, setAccountLoading] = useState(true);
  const [catalog, setCatalog] = useState<ModelCatalog | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);

  const loadAccount = useCallback(async () => {
    setAccountLoading(true);
    try {
      setAccount(await getAnyRouterAccount());
      setAccountError(null);
    } catch (e) {
      setAccount(null);
      setAccountError(
        e instanceof Error ? e.message : "Could not read your AnyRouter account.",
      );
    } finally {
      setAccountLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAccount();
  }, [loadAccount]);

  // The catalog works signed out, so it loads on its own and fails on its own.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCatalogLoading(true);
      try {
        const data = await getModelCatalog();
        if (!cancelled) {
          setCatalog(data);
          setCatalogError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setCatalogError(
            e instanceof Error ? e.message : "Could not load the model list.",
          );
        }
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const canManage = (account?.scopes ?? []).includes("write:byok");

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <h1 className="mb-4 text-lg font-semibold">Settings</h1>
      <div className="mb-4 flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "-mb-px border-b-2 border-transparent px-3 py-2 text-xs text-muted-foreground hover:text-foreground",
              tab === t.id && "border-brand text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "account" ? (
        <Account
          account={account}
          loading={accountLoading}
          error={accountError}
          onRefresh={loadAccount}
          onUseApiKey={() => setTab("model")}
        />
      ) : null}

      {tab === "model" ? (
        <ModelSettings
          providers={providers}
          provider={provider}
          onProviderChange={onProviderChange}
          model={model}
          onModelChange={onModelChange}
          apiKey={apiKey}
          onApiKeyChange={onApiKeyChange}
          baseUrl={baseUrl}
          onBaseUrlChange={onBaseUrlChange}
          catalog={catalog}
          catalogError={catalogError}
          catalogLoading={catalogLoading}
          saveStatus={saveStatus}
          saveError={saveError}
          onSave={onSave}
        />
      ) : null}

      {tab === "byok" ? <Byok canManage={canManage} /> : null}
    </div>
  );
}
