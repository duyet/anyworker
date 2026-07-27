"use client"

import { useId, useState } from "react"
import {
  Check,
  Clock,
  FolderOpen,
  Loader,
  Paperclip,
  Send,
  Square,
} from "lucide-react"

import { Logo } from "@/components/landing/logos"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { heroStudio } from "@/content/site"
import { cn } from "@/lib/utils"

type Phase = "waiting" | "approved" | "edited"

/**
 * Live product UI demo in the hero — real shadcn/Base UI components
 * (Button, Badge, Card, Tabs, Separator), interactive approval + composer.
 * Copy stays in site.ts; this is the interface shell only.
 */
export function HeroStudio() {
  const [phase, setPhase] = useState<Phase>("waiting")
  const [draft, setDraft] = useState("")
  const composerId = useId()

  return (
    <figure id="product-demo" className="mt-14 w-full max-w-5xl scroll-mt-24 text-left">
      <div className="overflow-hidden rounded-card border border-border bg-surface shadow-lift">
        <TitleBar phase={phase} />
        <div className="flex min-h-[28rem]">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <SessionHeader />
            <Tabs defaultValue="run" className="flex min-h-0 flex-1 flex-col gap-0">
              <div className="border-b border-border px-4 py-2">
                <TabsList variant="line" className="h-auto w-full justify-start gap-1 p-0">
                  <TabsTrigger value="run" className="rounded-control px-3 py-1.5 text-xs">
                    Task run
                  </TabsTrigger>
                  <TabsTrigger
                    value="composer"
                    className="rounded-control px-3 py-1.5 text-xs"
                  >
                    Composer
                  </TabsTrigger>
                  <TabsTrigger
                    value="tools"
                    className="rounded-control px-3 py-1.5 text-xs"
                  >
                    Tools
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent
                value="run"
                className="mt-0 flex min-h-0 flex-1 flex-col outline-none"
              >
                <RunPanel phase={phase} onApprove={() => setPhase("approved")} onEdit={() => setPhase("edited")} />
              </TabsContent>

              <TabsContent
                value="composer"
                className="mt-0 flex min-h-0 flex-1 flex-col outline-none"
              >
                <ComposerPanel
                  id={composerId}
                  draft={draft}
                  setDraft={setDraft}
                  onSend={() => {
                    if (draft.trim()) setDraft("")
                  }}
                />
              </TabsContent>

              <TabsContent
                value="tools"
                className="mt-0 flex min-h-0 flex-1 flex-col outline-none"
              >
                <ToolsPanel />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
      <figcaption className="mt-3 text-center text-xs text-subtle-foreground">
        {heroStudio.caption}
      </figcaption>
    </figure>
  )
}

function TitleBar({ phase }: { phase: Phase }) {
  const status =
    phase === "approved"
      ? heroStudio.statusDone
      : phase === "edited"
        ? heroStudio.statusEdit
        : heroStudio.statusLabel

  return (
    <div className="flex items-center gap-3 border-b border-border bg-surface-muted px-4 py-3">
      <div className="flex gap-1.5" aria-hidden="true">
        <span className="size-2.5 rounded-pill bg-border-strong" />
        <span className="size-2.5 rounded-pill bg-border-strong" />
        <span className="size-2.5 rounded-pill bg-border-strong" />
      </div>
      <p className="text-xs font-medium text-muted-foreground">
        {heroStudio.appName}
      </p>
      <Badge
        variant="secondary"
        className={cn(
          "ml-auto h-6 gap-1.5 font-medium",
          phase === "waiting" && "bg-brand-muted text-brand"
        )}
      >
        {phase === "waiting" ? (
          <span
            className="size-1.5 rounded-pill bg-brand motion-safe:animate-pulse"
            aria-hidden="true"
          />
        ) : (
          <Check className="size-3" aria-hidden="true" />
        )}
        {status}
      </Badge>
    </div>
  )
}

function Sidebar() {
  const { sidebar } = heroStudio

  return (
    <aside className="hidden w-52 shrink-0 flex-col border-r border-border bg-surface-muted sm:flex">
      <div className="flex flex-col gap-5 p-4">
        <div>
          <p className="mb-2.5 text-[0.65rem] eyebrow text-subtle-foreground">
            {sidebar.tasksLabel}
          </p>
          <ul className="flex flex-col gap-0.5">
            {sidebar.tasks.map((task) => (
              <li key={task.name}>
                <Button
                  variant={task.state === "running" ? "secondary" : "ghost"}
                  size="sm"
                  className={cn(
                    "h-auto w-full justify-start gap-2 px-2 py-1.5 text-xs font-normal",
                    task.state === "running" && "font-medium"
                  )}
                >
                  <TaskDot state={task.state} />
                  <span className="truncate">{task.name}</span>
                </Button>
              </li>
            ))}
          </ul>
        </div>

        <Separator />

        <div>
          <p className="mb-2.5 text-[0.65rem] eyebrow text-subtle-foreground">
            {sidebar.connectionsLabel}
          </p>
          <ul className="flex flex-col gap-1">
            {sidebar.connections.map((c) => (
              <li key={c.name}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto w-full justify-start gap-2 px-2 py-1.5 text-xs font-normal text-muted-foreground"
                >
                  <span aria-hidden="true" className="flex shrink-0">
                    <Logo name={c.logo} className="size-4" />
                  </span>
                  {c.name}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  )
}

function SessionHeader() {
  const { task } = heroStudio
  return (
    <div className="border-b border-border px-5 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="truncate text-sm font-medium text-foreground">
          {task.title}
        </p>
        <Badge variant="outline" className="font-mono text-[0.65rem]">
          {task.meta}
        </Badge>
      </div>
    </div>
  )
}

function RunPanel({
  phase,
  onApprove,
  onEdit,
}: {
  phase: Phase
  onApprove: () => void
  onEdit: () => void
}) {
  const { task } = heroStudio

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
        <div className="self-end max-w-[85%] rounded-card rounded-br-sm bg-brand-muted px-4 py-2.5">
          <p className="text-[0.65rem] font-medium text-brand/80">
            {task.youLabel}
          </p>
          <p className="mt-0.5 text-sm text-brand">{task.prompt}</p>
        </div>

        <ol className="flex flex-col gap-2" aria-label="Tool steps">
          {task.steps.map((step) => {
            const waiting = step.state === "waiting" && phase === "waiting"
            const done =
              step.state === "done" ||
              (step.state === "waiting" && phase !== "waiting")

            return (
              <li key={step.label}>
                <Card
                  size="sm"
                  className={cn(
                    "py-3 ring-border/40",
                    waiting && "ring-brand/30"
                  )}
                >
                  <CardContent className="flex items-start gap-2.5 px-3">
                    <StepIcon waiting={waiting} done={done} />
                    <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span
                        className={cn(
                          "text-sm font-medium",
                          waiting ? "text-brand" : "text-foreground"
                        )}
                      >
                        {step.label}
                      </span>
                      <span className="min-w-0 text-sm text-muted-foreground">
                        {step.detail}
                      </span>
                      {step.tool ? (
                        <Badge variant="outline" className="font-mono text-[0.65rem]">
                          {step.tool}
                        </Badge>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              </li>
            )
          })}
        </ol>

        {phase === "waiting" ? (
          <Card className="border-brand/25 bg-surface-muted ring-brand/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                {heroStudio.approval.title}
              </CardTitle>
              <CardDescription className="text-xs">
                {heroStudio.approval.body}
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex flex-wrap gap-2 border-t border-border pt-3">
              <Button size="sm" onClick={onApprove}>
                {task.approveLabel}
              </Button>
              <Button size="sm" variant="outline" onClick={onEdit}>
                {task.editLabel}
              </Button>
              <span className="ml-auto self-center text-[0.7rem] text-subtle-foreground">
                {task.checkInNote}
              </span>
            </CardFooter>
          </Card>
        ) : null}

        {phase === "approved" ? (
          <Card className="bg-brand-muted ring-brand/20">
            <CardContent className="flex items-center gap-2 px-4 py-3 text-sm text-brand">
              <Check className="size-4 shrink-0" aria-hidden="true" />
              {heroStudio.approval.sent}
            </CardContent>
          </Card>
        ) : null}

        {phase === "edited" ? (
          <Card>
            <CardContent className="px-4 py-3 text-sm text-muted-foreground">
              {heroStudio.approval.editNote}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  )
}

function ComposerPanel({
  id,
  draft,
  setDraft,
  onSend,
}: {
  id: string
  draft: string
  setDraft: (v: string) => void
  onSend: () => void
}) {
  const c = heroStudio.composer

  return (
    <div className="flex flex-1 flex-col justify-end gap-3 p-5">
      <Card className="bg-surface-muted">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{c.title}</CardTitle>
          <CardDescription className="text-xs">{c.hint}</CardDescription>
        </CardHeader>
        <CardContent className="px-(--card-spacing)">
          <label htmlFor={id} className="sr-only">
            {c.placeholder}
          </label>
          <textarea
            id={id}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                onSend()
              }
            }}
            rows={3}
            placeholder={c.placeholder}
            className="w-full resize-none rounded-control border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-subtle-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none"
          />
        </CardContent>
        <CardFooter className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <Button type="button" size="sm" variant="outline">
            <Paperclip className="size-3.5" aria-hidden="true" />
            {c.attach}
          </Button>
          <Button type="button" size="sm" variant="outline">
            <FolderOpen className="size-3.5" aria-hidden="true" />
            {c.folder}
          </Button>
          <Button
            type="button"
            size="sm"
            className="ml-auto"
            disabled={!draft.trim()}
            onClick={onSend}
          >
            {c.send}
            <Send className="size-3.5" aria-hidden="true" />
          </Button>
        </CardFooter>
      </Card>
      <p className="text-center text-[0.7rem] text-subtle-foreground">
        {c.footer}
      </p>
    </div>
  )
}

function ToolsPanel() {
  const tools = heroStudio.tools

  return (
    <div className="grid flex-1 content-start gap-3 p-5 sm:grid-cols-2">
      {tools.map((tool) => (
        <Card key={tool.name} size="sm" className="py-3">
          <CardHeader className="gap-1 px-3 pb-1">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="font-mono text-xs">{tool.name}</CardTitle>
              <Badge
                variant={tool.risk === "ask" ? "default" : "secondary"}
                className="text-[0.65rem]"
              >
                {tool.risk === "ask" ? toolsAskLabel() : toolsAutoLabel()}
              </Badge>
            </div>
            <CardDescription className="text-xs">{tool.detail}</CardDescription>
          </CardHeader>
          <CardFooter className="px-3 pt-2">
            {tool.risk === "ask" ? (
              <div className="flex gap-2">
                <Button size="xs">{heroStudio.toolsUi.allow}</Button>
                <Button size="xs" variant="outline">
                  {heroStudio.toolsUi.deny}
                </Button>
              </div>
            ) : (
              <span className="inline-flex items-center gap-1 text-[0.7rem] text-subtle-foreground">
                <Check className="size-3" aria-hidden="true" />
                {heroStudio.toolsUi.auto}
              </span>
            )}
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}

function toolsAskLabel() {
  return heroStudio.toolsUi.askBadge
}

function toolsAutoLabel() {
  return heroStudio.toolsUi.autoBadge
}

function TaskDot({ state }: { state: string }) {
  if (state === "running") {
    return (
      <Loader
        className="size-3 shrink-0 text-brand motion-safe:animate-spin"
        aria-hidden="true"
      />
    )
  }
  if (state === "scheduled") {
    return (
      <Clock
        className="size-3 shrink-0 text-subtle-foreground"
        aria-hidden="true"
      />
    )
  }
  return (
    <Check
      className="size-3 shrink-0 text-subtle-foreground"
      aria-hidden="true"
    />
  )
}

function StepIcon({ waiting, done }: { waiting: boolean; done: boolean }) {
  if (waiting) {
    return (
      <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-pill bg-brand-muted">
        <Loader
          className="size-2.5 text-brand motion-safe:animate-spin"
          aria-hidden="true"
        />
      </span>
    )
  }

  if (done) {
    return (
      <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-pill bg-brand text-brand-foreground">
        <Check className="size-2.5" aria-hidden="true" />
      </span>
    )
  }

  return (
    <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-pill border border-border">
      <Square className="size-2 text-subtle-foreground" aria-hidden="true" />
    </span>
  )
}
