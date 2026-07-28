import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { ChatItem } from "../types";
import {
  Sparkles,
  Code2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  User,
  FileText,
  Loader2,
  CheckCheck,
} from "lucide-react";

function toolIcon(name: string) {
  const lowered = name.toLowerCase();
  if (lowered.includes("read") || lowered.includes("pdf") || lowered.includes("file"))
    return <FileText className="size-3" />;
  if (lowered.includes("search") || lowered.includes("grep") || lowered.includes("glob"))
    return <FileText className="size-3" />;
  if (lowered.includes("bash") || lowered.includes("shell") || lowered.includes("exec"))
    return <Code2 className="size-3" />;
  return <Code2 className="size-3" />;
}

export function ChatRow({
  item,
  onApprove,
}: {
  item: ChatItem;
  onApprove?: (approvalId: string, outcome: "once" | "always_tool" | "deny") => void;
}) {
  if (item.kind === "user") {
    return (
      <div className="flex gap-3">
        <Avatar className="size-7 mt-0.5 shrink-0">
          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
            <User className="size-3.5" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0 rounded-xl border border-input bg-background px-4 py-3 text-sm leading-relaxed">
          {item.text}
        </div>
      </div>
    );
  }

  if (item.kind === "assistant") {
    return (
      <div className="flex gap-3">
        <Avatar className="size-7 mt-0.5 shrink-0">
          <AvatarFallback className="bg-brand text-brand-foreground text-xs">
            <Sparkles className="size-3.5" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0 rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm leading-relaxed prose prose-invert max-w-none">
          <Markdown remarkPlugins={[remarkGfm]}>{item.text}</Markdown>
        </div>
      </div>
    );
  }

  if (item.kind === "tool") {
    const done = item.status === "end";
    return (
      <div className="flex gap-3 pl-10">
        <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-surface-muted/50 px-3 py-2 text-xs font-mono text-muted-foreground">
          {toolIcon(item.name)}
          <span>{item.name}</span>
          {done ? (
            <CheckCheck className="size-3 text-ok" />
          ) : (
            <Loader2 className="size-3 animate-spin text-brand" />
          )}
          {item.result ? (
            <span className="text-[10px] text-muted-foreground ml-1 truncate max-w-[200px]">
              {item.result}
            </span>
          ) : null}
        </div>
      </div>
    );
  }

  if (item.kind === "error") {
    return (
      <div className="flex gap-3">
        <div className="flex-1 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <div className="flex items-center gap-2 font-medium mb-1">
            <AlertCircle className="size-4" />
            Error
          </div>
          <p className="text-xs">{item.text}</p>
        </div>
      </div>
    );
  }

  if (item.kind === "approval") {
    return (
      <div className="flex gap-3 pl-10">
        <Card className="flex-1 border-brand/30 p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-brand/10 p-2">
              <Code2 className="size-4 text-brand" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium mb-1">
                Approve <code className="rounded bg-surface-muted px-1.5 py-0.5 text-xs font-mono">{item.tool}</code>?
              </div>
              <p className="text-xs text-muted-foreground mb-3">{item.reason}</p>
              <pre className="max-h-32 overflow-auto rounded-lg bg-surface-muted p-3 text-[11px] text-muted-foreground font-mono mb-3 border border-border/50">
                {JSON.stringify(item.args, null, 2)}
              </pre>
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => onApprove?.(item.id, "once")}
                >
                  <CheckCircle2 className="size-3.5" />
                  Allow once
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => onApprove?.(item.id, "always_tool")}
                >
                  <CheckCircle2 className="size-3.5" />
                  Always
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs gap-1.5 text-destructive hover:text-destructive"
                  onClick={() => onApprove?.(item.id, "deny")}
                >
                  <XCircle className="size-3.5" />
                  Deny
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (item.kind === "status") {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground pl-4">
        <div className="flex gap-1">
          <span className="size-1.5 rounded-full bg-muted-foreground animate-pulse" />
          <span className="size-1.5 rounded-full bg-muted-foreground animate-pulse" style={{ animationDelay: "0.15s" }} />
          <span className="size-1.5 rounded-full bg-muted-foreground animate-pulse" style={{ animationDelay: "0.3s" }} />
        </div>
        {item.text}
      </div>
    );
  }

  return null;
}
