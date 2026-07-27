import { useState } from "react";
import { anyRouterSignOut, type AnyRouterAccount } from "../../api";
import { SignIn } from "../SignIn";

const MANAGEMENT_SCOPE = "write:byok";

export function Account({
  account,
  loading,
  error,
  onRefresh,
  onUseApiKey,
}: {
  account: AnyRouterAccount | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onUseApiKey?: () => void;
}) {
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  if (loading) {
    return <p className="text-xs text-muted-foreground">Loading your account…</p>;
  }

  if (error) {
    return (
      <div className="max-w-md space-y-3">
        <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
          {error}
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-surface-muted"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!account?.signed_in) {
    return <SignIn onSignedIn={onRefresh} onUseApiKey={onUseApiKey} />;
  }

  const canManage = (account.scopes ?? []).includes(MANAGEMENT_SCOPE);

  const signOut = async () => {
    setSigningOut(true);
    setSignOutError(null);
    try {
      await anyRouterSignOut();
      onRefresh();
    } catch (e) {
      setSignOutError(e instanceof Error ? e.message : "Could not sign out.");
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="max-w-md space-y-3">
      <div className="rounded-lg border border-border bg-surface px-3 py-3">
        <div className="text-sm font-medium">
          Signed in as {account.email || account.name || account.user_id}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          {account.credits === null || account.credits === undefined
            ? "Credit balance unavailable"
            : `Credit: $${account.credits.toFixed(2)}`}
        </div>
      </div>

      {canManage ? null : (
        <div className="rounded-md border border-border bg-surface-muted px-3 py-2 text-xs text-muted-foreground">
          You declined the management permission, so provider keys and presets are
          unavailable. Sign in again to grant it.
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onRefresh}
          className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-surface-muted"
        >
          Refresh
        </button>
        <button
          type="button"
          disabled={signingOut}
          onClick={signOut}
          className="rounded-md border border-danger/40 px-3 py-1.5 text-xs text-danger disabled:opacity-40"
        >
          Sign out
        </button>
      </div>

      {canManage ? null : (
        <SignIn onSignedIn={onRefresh} />
      )}

      {signOutError ? (
        <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
          {signOutError}
        </div>
      ) : null}
    </div>
  );
}
