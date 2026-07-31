import { useCallback, useEffect, useState } from "react";
import { getSessionActivity, type ActivityRecord } from "../api";

const PAGE = 50;

/**
 * Activity for one session, newest first, one page at a time.
 *
 * The server pages with a `before` cursor holding the `ts` of the oldest
 * record you already have, so nothing is loaded twice and nothing loads
 * up front beyond the first page.
 */
export function useActivity(sessionId: string | null) {
  const [records, setRecords] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const loadFirst = useCallback(async () => {
    if (!sessionId) {
      setRecords([]);
      setHasMore(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const page = await getSessionActivity(sessionId, { limit: PAGE });
      setRecords(page);
      setHasMore(page.length === PAGE);
    } catch (e: unknown) {
      setRecords([]);
      setHasMore(false);
      setError(e instanceof Error ? e.message : "Could not load history.");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void loadFirst();
  }, [loadFirst]);

  const loadMore = useCallback(async () => {
    if (!sessionId || records.length === 0) return;
    const before = records[records.length - 1].ts;
    setLoadingMore(true);
    setError(null);
    try {
      const page = await getSessionActivity(sessionId, { limit: PAGE, before });
      setRecords((prev) => [...prev, ...page]);
      setHasMore(page.length === PAGE);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not load older history.");
    } finally {
      setLoadingMore(false);
    }
  }, [sessionId, records]);

  return { records, loading, loadingMore, error, hasMore, reload: loadFirst, loadMore };
}
