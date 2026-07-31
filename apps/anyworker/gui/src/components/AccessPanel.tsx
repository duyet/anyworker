import { useCallback, useEffect, useState } from "react";
import { getWorkspacePolicy, revokeWorkspacePolicy, type PolicyRule } from "../api";
import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";

/**
 * Permissions actually in force for this workspace, with a revoke control.
 * Only "Always allow" decisions are durable, so only those appear here.
 */
export function AccessPanel({ workspace }: { workspace: string }) {
  const [rules, setRules] = useState<PolicyRule[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await getWorkspacePolicy(workspace || undefined);
      setRules(data.rules);
    } catch (e: unknown) {
      setRules(null);
      setError(e instanceof Error ? e.message : "Could not load permissions.");
    }
  }, [workspace]);

  useEffect(() => {
    void load();
  }, [load]);

  const revoke = async (tool: string) => {
    setRevoking(tool);
    try {
      await revokeWorkspacePolicy(tool, workspace || undefined);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not revoke it.");
    } finally {
      setRevoking(null);
    }
  };

  if (error) {
    return (
      <div className="space-y-1">
        <p className="text-[11px] text-destructive">{error}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="text-[11px] underline text-muted-foreground"
        >
          Try again
        </button>
      </div>
    );
  }

  if (rules === null) {
    return <p className="text-[11px] text-muted-foreground">Loading permissions…</p>;
  }

  if (rules.length === 0) {
    return (
      <p className="text-[11px] text-muted-foreground">
        Nothing is allowed up front. Pick “Always allow” on an approval to save it here.
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {rules.map((rule) => (
        <div
          key={rule.tool}
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs"
        >
          <ShieldCheck className="size-3.5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">{rule.tool}</div>
            <div className="text-[10px] text-muted-foreground">
              {rule.decision === "allow" ? "Runs without asking" : rule.decision}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-1.5 text-[10px]"
            disabled={revoking === rule.tool}
            onClick={() => void revoke(rule.tool)}
          >
            {revoking === rule.tool ? "…" : "Revoke"}
          </Button>
        </div>
      ))}
    </div>
  );
}
