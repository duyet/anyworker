import { useMemo, useState } from "react";
import type { ActivityRecord } from "../../api";
import { useActivity } from "../../hooks/useActivity";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, ChevronRight } from "lucide-react";

/** One turn: the records it produced, plus the `turn_end` that closed it. */
type Run = {
  end: ActivityRecord | null;
  records: ActivityRecord[];
};

/**
 * Split newest-first records into runs. Both runners emit `turn_start`, so it
 * is the run boundary: reading newest to oldest, it is the last record of the
 * run it opened. A run with no `turn_end` is still going.
 */
function toRuns(records: ActivityRecord[]): Run[] {
  const runs: Run[] = [];
  let current: Run | null = null;
  for (const record of records) {
    if (current === null) {
      current = { end: null, records: [] };
      runs.push(current);
    }
    if (record.type === "turn_end" && current.end === null) current.end = record;
    current.records.push(record);
    // turn_start opened this run, so it closes it when read newest-first.
    if (record.type === "turn_start") current = null;
  }
  return runs;
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");

function writtenPath(record: ActivityRecord): string | null {
  if (record.type !== "tool_end" || str(record.payload.name) !== "WriteFile") return null;
  try {
    const result = JSON.parse(str(record.payload.result) || "{}");
    return result?.ok && typeof result.path === "string" ? result.path : null;
  } catch {
    return null;
  }
}

function summarise(run: Run) {
  const tools: string[] = [];
  const files: string[] = [];
  const approvals: Array<{ tool: string; outcome: string }> = [];
  const errors: string[] = [];

  // Records are newest-first; read oldest-first so the order matches the run.
  for (const record of [...run.records].reverse()) {
    if (record.type === "tool_start") tools.push(str(record.payload.name) || "tool");
    if (record.type === "permission_required" && record.payload.outcome !== undefined) {
      approvals.push({
        tool: str(record.payload.tool_name) || "tool",
        outcome: str(record.payload.outcome) || "unknown",
      });
    }
    if (record.type === "error") errors.push(str(record.payload.message) || "Unknown error");
    const path = writtenPath(record);
    if (path && !files.includes(path)) files.push(path);
  }
  return { tools, files, approvals, errors };
}

const OUTCOME_LABEL: Record<string, string> = {
  once: "allowed once",
  always_tool: "always allowed",
  deny: "denied",
};

const SUBTYPE_LABEL: Record<string, string> = {
  ok: "Finished",
  error: "Failed",
  interrupted: "Stopped",
  max_iterations: "Hit the tool limit",
};

function when(ts: number): string {
  return new Date(ts * 1000).toLocaleString();
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
        {title}
      </div>
      {children}
    </div>
  );
}

function RunCard({ run, index }: { run: Run; index: number }) {
  const [open, setOpen] = useState(index === 0);
  const { tools, files, approvals, errors } = useMemo(() => summarise(run), [run]);

  const subtype = str(run.end?.payload.subtype);
  const status = run.end ? SUBTYPE_LABEL[subtype] || "Finished" : "Still running";
  const ts = run.records[0]?.ts ?? 0;

  const counts = [
    tools.length ? `${tools.length} tool calls` : null,
    files.length ? `${files.length} files written` : null,
    approvals.length ? `${approvals.length} approvals` : null,
    errors.length ? `${errors.length} errors` : null,
  ].filter(Boolean);

  return (
    <div className="rounded-lg border border-border bg-surface">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-start gap-2 px-3 py-2.5 text-left"
      >
        {open ? (
          <ChevronDown className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs font-medium">{status}</span>
            <span className="shrink-0 text-[10px] text-muted-foreground">{when(ts)}</span>
          </div>
          <div className="truncate text-[11px] text-muted-foreground">
            {counts.length ? counts.join(" · ") : "Nothing recorded for this run."}
          </div>
        </div>
      </button>

      {open && (
        <div className="space-y-3 border-t border-border px-3 py-2.5 pl-8">
          {tools.length > 0 && (
            <Section title="Tools called">
              <ul className="space-y-0.5 text-xs">
                {tools.map((tool, i) => (
                  <li key={i} className="font-mono text-[11px]">
                    {tool}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {files.length > 0 && (
            <Section title="Files written">
              <ul className="space-y-0.5 text-xs">
                {files.map((file) => (
                  <li key={file} className="truncate font-mono text-[11px]">
                    {file}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {approvals.length > 0 && (
            <Section title="Approvals">
              <ul className="space-y-0.5 text-xs">
                {approvals.map((approval, i) => (
                  <li key={i} className="text-[11px]">
                    <span className="font-mono">{approval.tool}</span>{" "}
                    <span className="text-muted-foreground">
                      {OUTCOME_LABEL[approval.outcome] || approval.outcome}
                    </span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {errors.length > 0 && (
            <Section title="Errors">
              <ul className="space-y-0.5">
                {errors.map((message, i) => (
                  <li key={i} className="text-[11px] text-destructive">
                    {message}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {counts.length === 0 && (
            <p className="text-[11px] text-muted-foreground">
              This run left no tool calls or files.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** Run history for one session: what happened, newest first. */
export function History({
  sessionId,
  title,
}: {
  sessionId: string | null;
  title: string;
}) {
  const { records, loading, loadingMore, error, hasMore, reload, loadMore } =
    useActivity(sessionId);
  const runs = useMemo(() => toRuns(records), [records]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold">History</h1>
          <p className="truncate text-[11px] text-muted-foreground">
            {sessionId ? title : "No session selected"}
          </p>
        </div>
        {sessionId && (
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => void reload()}>
            Refresh
          </Button>
        )}
      </header>

      <ScrollArea className="min-h-0 flex-1">
        <div className="mx-auto max-w-2xl space-y-2 p-5">
          {!sessionId ? (
            <p className="text-xs text-muted-foreground">
              Pick a session to see what it did.
            </p>
          ) : loading ? (
            <p className="text-xs text-muted-foreground">Loading history…</p>
          ) : error ? (
            <div className="space-y-2">
              <p className="text-xs text-destructive">{error}</p>
              <Button variant="outline" size="sm" className="text-xs" onClick={() => void reload()}>
                Try again
              </Button>
            </div>
          ) : runs.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Nothing here yet. Give it work and the runs show up.
            </p>
          ) : (
            <>
              {runs.map((run, i) => (
                <RunCard key={`${run.records[0]?.ts ?? i}-${i}`} run={run} index={i} />
              ))}
              {hasMore && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  disabled={loadingMore}
                  onClick={() => void loadMore()}
                >
                  {loadingMore ? "Loading…" : "Load older runs"}
                </Button>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
