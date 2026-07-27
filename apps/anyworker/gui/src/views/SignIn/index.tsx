import { useEffect, useRef, useState } from "react";
import { getAnyRouterSignInStatus, startAnyRouterSignIn } from "../../api";

const POLL_MS = 2000;
const TIMEOUT_MS = 3 * 60 * 1000;

export function SignIn({
  onSignedIn,
  onUseApiKey,
}: {
  onSignedIn: () => void;
  onUseApiKey?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      for (const t of timers.current) window.clearTimeout(t);
    };
  }, []);

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      const { authorize_url, request_id } = await startAnyRouterSignIn();
      if (!authorize_url || !request_id) {
        throw new Error("The server did not return a sign-in link.");
      }
      window.open(authorize_url, "_blank", "noopener,noreferrer");
      setWaiting(true);
      const deadline = Date.now() + TIMEOUT_MS;
      const poll = async () => {
        try {
          const s = await getAnyRouterSignInStatus(request_id);
          if (s.status === "ok") {
            setWaiting(false);
            setBusy(false);
            onSignedIn();
            return;
          }
          if (s.status === "error") {
            setWaiting(false);
            setBusy(false);
            setError(s.error || "Sign-in failed. Try again.");
            return;
          }
        } catch (e) {
          setWaiting(false);
          setBusy(false);
          setError(e instanceof Error ? e.message : "Sign-in failed. Try again.");
          return;
        }
        if (Date.now() > deadline) {
          setWaiting(false);
          setBusy(false);
          setError("Sign-in timed out. Try again.");
          return;
        }
        timers.current.push(window.setTimeout(poll, POLL_MS));
      };
      timers.current.push(window.setTimeout(poll, POLL_MS));
    } catch (e) {
      setBusy(false);
      setWaiting(false);
      setError(e instanceof Error ? e.message : "Could not start sign-in.");
    }
  };

  return (
    <div className="max-w-md space-y-3">
      <h2 className="text-sm font-semibold">Sign in to AnyRouter</h2>
      <p className="text-xs text-muted-foreground">
        Sign in to pick models, see your credit, and add your own provider keys. Free
        models are included.
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={start}
        className="rounded-md bg-brand px-3 py-2 text-sm font-medium text-brand-foreground disabled:opacity-40"
      >
        {waiting ? "Waiting for your browser…" : "Sign in with AnyRouter"}
      </button>
      {waiting ? (
        <p className="text-xs text-muted-foreground">
          Approve the request in the browser tab that just opened. This page updates on
          its own.
        </p>
      ) : null}
      {error ? (
        <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
          {error}
        </div>
      ) : null}
      {onUseApiKey ? (
        <button
          type="button"
          onClick={onUseApiKey}
          className="text-xs text-muted-foreground underline underline-offset-2"
        >
          Use an API key instead
        </button>
      ) : null}
    </div>
  );
}
