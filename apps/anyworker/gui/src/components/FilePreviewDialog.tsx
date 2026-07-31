import { useEffect, useState } from "react";
import { getWorkspaceFile, type WorkspaceFile } from "../api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

function bytes(n?: number): string {
  if (typeof n !== "number") return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-left text-xs">
        <thead className="bg-surface-muted">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="px-2.5 py-1.5 font-medium whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-border">
              {headers.map((_, j) => (
                <td key={j} className="px-2.5 py-1.5 align-top">
                  {row[j] ?? ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Renders whichever body shape the server sent back for this file. */
function Preview({ file }: { file: WorkspaceFile }) {
  if (file.ok === false) {
    return (
      <p className="text-xs text-muted-foreground">
        {file.reason || file.error || "The server would not read this file."}
      </p>
    );
  }

  if (file.sheets) {
    const sheets = Object.entries(file.sheets);
    if (sheets.length === 0)
      return <p className="text-xs text-muted-foreground">This sheet is empty.</p>;
    return (
      <div className="space-y-4">
        {sheets.map(([name, sheet]) => (
          <div key={name} className="space-y-1.5">
            <div className="text-[11px] font-medium">{name}</div>
            <Table headers={sheet.headers ?? []} rows={sheet.rows ?? []} />
          </div>
        ))}
      </div>
    );
  }

  if (file.headers) {
    const headers = file.headers;
    const rows = (file.rows ?? []).map((row) => headers.map((h) => row[h] ?? ""));
    if (rows.length === 0)
      return <p className="text-xs text-muted-foreground">This file has no rows.</p>;
    return <Table headers={headers} rows={rows} />;
  }

  if (typeof file.content === "string") {
    if (file.content.length === 0)
      return <p className="text-xs text-muted-foreground">This file is empty.</p>;
    return (
      <pre className="whitespace-pre-wrap break-words rounded-md bg-surface-muted p-3 font-mono text-[11px] leading-relaxed">
        {file.content}
      </pre>
    );
  }

  return (
    <p className="text-xs text-muted-foreground">
      {file.error || "Nothing to show for this file."}
    </p>
  );
}

/**
 * Loads and previews one workspace file. `path` is workspace-relative; pass
 * `null` to close.
 */
export function FilePreviewDialog({
  path,
  onClose,
}: {
  path: string | null;
  onClose: () => void;
}) {
  const [file, setFile] = useState<WorkspaceFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    setFile(null);
    setError(null);
    setLoading(true);
    getWorkspaceFile(path)
      .then((data) => {
        if (!cancelled) setFile(data);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not open it.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  const meta = [
    file?.size !== undefined ? bytes(file.size) : null,
    file?.pages ? `${file.pages} pages` : null,
    file?.row_count !== undefined ? `${file.row_count} rows` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Dialog open={path !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="truncate text-sm">{path ?? ""}</DialogTitle>
          <DialogDescription className="text-[11px]">
            {meta || "Read from your workspace."}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <div className="pr-3">
            {loading ? (
              <p className="text-xs text-muted-foreground">Opening it…</p>
            ) : error ? (
              <p className="text-xs text-destructive">{error}</p>
            ) : file ? (
              <Preview file={file} />
            ) : null}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
