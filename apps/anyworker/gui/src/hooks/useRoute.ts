import { useCallback, useEffect, useState } from "react";

export type Route = "chat" | "settings" | "plugins" | "history";

const ROUTES: Route[] = ["chat", "settings", "plugins", "history"];

function readHash(): Route {
  const raw = window.location.hash.replace(/^#\/?/, "");
  return (ROUTES as string[]).includes(raw) ? (raw as Route) : "chat";
}

/** Tiny hash router: `#/chat`, `#/settings`, `#/plugins`, `#/history`. */
export function useRoute() {
  const [route, setRoute] = useState<Route>(readHash);

  useEffect(() => {
    const onHashChange = () => setRoute(readHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const navigate = useCallback((next: Route) => {
    window.location.hash = `#/${next}`;
    setRoute(next);
  }, []);

  return { route, navigate };
}
