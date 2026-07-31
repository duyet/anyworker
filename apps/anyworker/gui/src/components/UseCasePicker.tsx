import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { UseCaseTemplate } from "../types";
import {
  FileSearch,
  GitCompare,
  Table,
  PenLine,
  ArrowRight,
} from "lucide-react";

const ICONS: Record<string, React.ReactNode> = {
  FileSearch: <FileSearch className="size-5" />,
  GitCompare: <GitCompare className="size-5" />,
  Table: <Table className="size-5" />,
  PenLine: <PenLine className="size-5" />,
};

const CATEGORY_LABELS: Record<string, string> = {
  summarize: "Summarize",
  compare: "Compare",
  spreadsheet: "Spreadsheet",
  write: "Write",
};

export function UseCasePicker({
  templates,
  onPick,
}: {
  templates: UseCaseTemplate[];
  onPick: (t: UseCaseTemplate) => void;
}) {
  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="text-center mb-8">
        <h2 className="text-lg font-semibold mb-2">What should we work on today?</h2>
        <p className="text-sm text-muted-foreground">
          Pick a use case or just start typing below.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {templates.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onPick(t)}
            className="group text-left"
          >
            <Card className="p-4 h-full border-border/60 hover:border-brand/40 hover:bg-surface-muted/50 transition-all cursor-pointer">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-brand/10 p-2.5 text-brand shrink-0">
                  {ICONS[t.icon] || <FileSearch className="size-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">{t.title}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {CATEGORY_LABELS[t.category] || t.category}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {t.description}
                  </p>
                </div>
                <ArrowRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
              </div>
            </Card>
          </button>
        ))}
      </div>
    </div>
  );
}
