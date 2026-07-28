import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText,
  HardDrive,
  Search,
  Globe,
  Github,
  Bot,
  FileCode,
} from "lucide-react";

const ACCESS_ITEMS = [
  { name: "Files", detail: "txt, pdf, csv, xlsx", icon: FileText },
  { name: "Search", detail: "ripgrep, glob", icon: Search },
  { name: "GitHub", detail: "PRs, issues, repos", icon: Github },
  { name: "Web", detail: "search + fetch", icon: Globe },
  { name: "Plugins", detail: "git install", icon: HardDrive },
];

export function RightRail({
  artifacts,
  provider,
  model,
}: {
  artifacts: Array<{ name: string; kind: string; content: string }>;
  provider: string;
  model: string;
}) {
  return (
    <aside className="flex w-56 shrink-0 flex-col border-l border-border bg-surface">
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {/* Model info */}
          <div>
            <h3 className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium mb-2">
              Active model
            </h3>
            <Card className="p-3">
              <div className="text-sm font-medium">{model || "No model"}</div>
              <div className="text-[11px] text-muted-foreground">
                {provider === "cas" ? "Full agent" : "Compat mode"}
              </div>
            </Card>
          </div>

          {/* Artifacts */}
          <div>
            <h3 className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium mb-2">
              Artifacts
            </h3>
            {artifacts.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">
                No files produced yet.
              </p>
            ) : (
              <div className="space-y-1.5">
                {artifacts.map((a, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-md border border-border bg-surface-muted px-2.5 py-2"
                  >
                    <FileCode className="size-3.5 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <div className="truncate text-xs font-medium">{a.name}</div>
                      <Badge variant="secondary" className="text-[9px] h-4">
                        {a.kind}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Access */}
          <div>
            <h3 className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium mb-2">
              Access
            </h3>
            <div className="space-y-1">
              {ACCESS_ITEMS.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs"
                >
                  <item.icon className="size-3.5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {item.detail}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Capabilities */}
          <div>
            <h3 className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium mb-2">
              Capabilities
            </h3>
            <div className="flex flex-wrap gap-1">
              <Badge variant="secondary" className="text-[9px] h-5">
                <Bot className="size-3 mr-1" />
                Claude Agent SDK
              </Badge>
              <Badge variant="secondary" className="text-[9px] h-5">
                Local tools
              </Badge>
              <Badge variant="secondary" className="text-[9px] h-5">
                Approval flow
              </Badge>
            </div>
          </div>
        </div>
      </ScrollArea>
    </aside>
  );
}
