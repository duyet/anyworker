"use client"

import {
  useCallback,
  useEffect,
  useId,
  useState,
  type ReactNode,
} from "react"
import {
  Check,
  Clock,
  FolderOpen,
  Loader,
  Paperclip,
  Send,
} from "lucide-react"

import { Logo } from "@/components/landing/logos"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { heroRelay, heroStudio } from "@/content/site"
import { cn } from "@/lib/utils"

type Phase = "waiting" | "approved" | "edited"

const STAGE_SRC: Record<"peaks" | "coast", string> = {
  peaks: "/brand/stage/peaks.webp",
  coast: "/brand/stage/coast.webp",
}

/**
 * Cursor / Superlog-style feature relay: painted stage + floating live windows.
 * Auto-advances scenes; pauses on hover/focus; reduced-motion stays on first scene.
 */
export function FeatureRelay() {
  const scenes = heroRelay.scenes
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [phase, setPhase] = useState<Phase>("waiting")
  const [draft, setDraft] = useState("")
  const composerId = useId()

  const scene = scenes[index]!
  const [reduceMotion, setReduceMotion] = useState(false)

  const go = useCallback(
    (next: number) => {
      setIndex(((next % scenes.length) + scenes.length) % scenes.length)
      setPhase("waiting")
      setDraft("")
    },
    [scenes.length]
  )

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReduceMotion(mq.matches)
    const onChange = () => setReduceMotion(mq.matches)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])

  useEffect(() => {
    if (paused || reduceMotion) return
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % scenes.length)
      setPhase("waiting")
      setDraft("")
    }, heroRelay.intervalMs)
    return () => window.clearInterval(id)
  }, [paused, reduceMotion, scenes.length])

  return (
    <figure
      id="product-demo"
      className="relative mx-auto w-full max-w-6xl scroll-mt-24 overflow-hidden rounded-card"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setPaused(false)
        }
      }}
    >
      {/* Stage painting — full card behind live demo windows */}
      <div className="absolute inset-0">
        {(["peaks", "coast"] as const).map((key) => (
          <img
            key={key}
            src={STAGE_SRC[key]}
            alt=""
            aria-hidden="true"
            className={cn(
              "absolute inset-0 size-full object-cover transition-opacity duration-700",
              scene.stage === key ? "opacity-100" : "opacity-0"
            )}
          />
        ))}
        <div
          className="absolute inset-0 bg-gradient-to-b from-black/15 via-black/5 to-background/85"
          aria-hidden="true"
        />
      </div>

      <div className="relative flex min-h-[30rem] flex-col justify-end px-3 pb-6 pt-14 sm:min-h-[34rem] sm:px-8 sm:pb-8 sm:pt-16 lg:min-h-[38rem]">
        {/* Window stack */}
        <div className="relative mx-auto w-full max-w-4xl">
          {scene.secondaryTitle ? (
            <div
              className={cn(
                "absolute -top-6 right-0 z-10 w-[min(100%,18rem)] sm:-top-8 sm:right-4 sm:w-72",
                "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500"
              )}
            >
              <DemoShell title={scene.secondaryTitle} compact>
                {scene.id === "checkin" ? <SlackPanel /> : null}
                {scene.id === "compose" ? <WorkspaceChips /> : null}
                {scene.id === "unattended" ? <ScheduleCard /> : null}
              </DemoShell>
            </div>
          ) : null}

          <div
            className={cn(
              "relative z-20 mx-auto w-full max-w-3xl",
              scene.secondaryTitle && "sm:mr-8 sm:ml-0 sm:max-w-[calc(100%-5rem)]"
            )}
          >
            <DemoShell title={scene.primaryTitle}>
              {scene.id === "delegate" || scene.id === "checkin" ? (
                <RunScene
                  phase={phase}
                  onApprove={() => setPhase("approved")}
                  onEdit={() => setPhase("edited")}
                  showApproval={scene.id === "checkin"}
                />
              ) : null}
              {scene.id === "tools" ? <ToolsScene /> : null}
              {scene.id === "compose" ? (
                <ComposerScene
                  id={composerId}
                  draft={draft}
                  setDraft={setDraft}
                  onSend={() => {
                    if (draft.trim()) setDraft("")
                  }}
                />
              ) : null}
              {scene.id === "unattended" ? <SessionsScene /> : null}
            </DemoShell>
          </div>
        </div>

        {/* Scene dots + caption */}
        <div className="relative z-20 mx-auto mt-5 flex w-full max-w-3xl flex-col items-center gap-3">
          <p className="text-center text-xs text-white/90 drop-shadow-sm sm:text-sm">
            {scene.caption}
          </p>
          <div
            className="flex flex-wrap items-center justify-center gap-1.5"
            role="tablist"
            aria-label="Feature scenes"
          >
            {scenes.map((s, i) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={s.label}
                onClick={() => go(i)}
                className={cn(
                  "rounded-pill px-2.5 py-1 text-[0.7rem] font-medium transition-colors backdrop-blur-sm",
                  i === index
                    ? "bg-white text-neutral-900 shadow-sm"
                    : "bg-black/25 text-white/90 hover:bg-black/40"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <figcaption className="sr-only">{heroRelay.stageAlt}</figcaption>
    </figure>
  )
}

function DemoShell({
  title,
  children,
  compact,
}: {
  title: string
  children: ReactNode
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        "demo-window overflow-hidden rounded-[0.75rem] border text-left"
      )}
    >
      <div className="flex items-center gap-3 border-b border-border bg-surface-muted px-3 py-2 sm:px-4">
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="size-2.5 rounded-pill bg-[#ff5f57]" />
          <span className="size-2.5 rounded-pill bg-[#febc2e]" />
          <span className="size-2.5 rounded-pill bg-[#28c840]" />
        </div>
        <p className="truncate text-xs font-medium text-muted-foreground">
          {title}
        </p>
      </div>
      <div className={cn("bg-surface", compact ? "p-3" : "min-h-[14rem]")}>
        {children}
      </div>
    </div>
  )
}

function RunScene({
  phase,
  onApprove,
  onEdit,
  showApproval,
}: {
  phase: Phase
  onApprove: () => void
  onEdit: () => void
  showApproval: boolean
}) {
  const { task } = heroStudio

  return (
    <div className="flex flex-col">
      <div className="border-b border-border px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium text-foreground">
            {task.title}
          </p>
          <Badge variant="outline" className="font-mono text-[0.65rem]">
            {task.meta}
          </Badge>
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
            {phase === "approved"
              ? heroStudio.statusDone
              : phase === "edited"
                ? heroStudio.statusEdit
                : heroStudio.statusLabel}
          </Badge>
        </div>
      </div>

      <div className="flex flex-col gap-3 p-4">
        <div className="self-end max-w-[85%] rounded-card rounded-br-sm bg-muted px-3 py-2">
          <p className="text-[0.65rem] font-medium text-muted-foreground">
            {task.youLabel}
          </p>
          <p className="mt-0.5 text-sm text-foreground">{task.prompt}</p>
        </div>

        <ol className="flex flex-col gap-1.5" aria-label="Tool steps">
          {task.steps.map((step) => {
            const waiting = step.state === "waiting" && phase === "waiting"
            const done =
              step.state === "done" ||
              (step.state === "waiting" && phase !== "waiting")
            return (
              <li
                key={step.label}
                className="flex items-start gap-2 rounded-control border border-border/60 bg-surface-muted/50 px-2.5 py-2"
              >
                {waiting ? (
                  <Loader
                    className="mt-0.5 size-3.5 shrink-0 text-brand motion-safe:animate-spin"
                    aria-hidden="true"
                  />
                ) : done ? (
                  <Check
                    className="mt-0.5 size-3.5 shrink-0 text-brand"
                    aria-hidden="true"
                  />
                ) : (
                  <span className="mt-1 size-2 shrink-0 rounded-pill border border-border" />
                )}
                <div className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "text-sm font-medium",
                      waiting ? "text-brand" : "text-foreground"
                    )}
                  >
                    {step.label}
                  </span>
                  <span className="ml-1.5 text-sm text-muted-foreground">
                    {step.detail}
                  </span>
                  {step.tool ? (
                    <Badge
                      variant="outline"
                      className="ml-1.5 font-mono text-[0.6rem]"
                    >
                      {step.tool}
                    </Badge>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ol>

        {showApproval && phase === "waiting" ? (
          <Card className="border-brand/25 bg-surface-muted ring-brand/15">
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
            </CardFooter>
          </Card>
        ) : null}

        {phase === "approved" ? (
          <p className="flex items-center gap-2 rounded-control bg-brand-muted px-3 py-2 text-sm text-brand">
            <Check className="size-4 shrink-0" aria-hidden="true" />
            {heroStudio.approval.sent}
          </p>
        ) : null}
        {phase === "edited" ? (
          <p className="rounded-control border border-border px-3 py-2 text-sm text-muted-foreground">
            {heroStudio.approval.editNote}
          </p>
        ) : null}
      </div>
    </div>
  )
}

function SlackPanel() {
  return (
    <div className="flex flex-col gap-2 text-left">
      <p className="text-xs font-semibold text-foreground">#exec</p>
      <p className="text-[0.7rem] text-muted-foreground">Board update draft</p>
      <Separator />
      <div className="rounded-control bg-surface-muted px-2.5 py-2">
        <p className="text-[0.65rem] font-medium text-muted-foreground">
          AnyWorker
        </p>
        <p className="mt-1 text-xs leading-relaxed text-foreground">
          Q3 board update ready for review — three figures checked against last
          month. Waiting on send to #exec.
        </p>
      </div>
      <Badge variant="secondary" className="w-fit text-[0.65rem]">
        Pending approval
      </Badge>
    </div>
  )
}

function WorkspaceChips() {
  const chips = heroStudio.sidebar.connections
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[0.65rem] eyebrow text-subtle-foreground">
        {heroStudio.sidebar.connectionsLabel}
      </p>
      <ul className="flex flex-col gap-1">
        {chips.map((c) => (
          <li key={c.name}>
            <div className="flex items-center gap-2 rounded-control px-1.5 py-1 text-xs text-muted-foreground">
              <Logo name={c.logo} className="size-3.5" />
              {c.name}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ScheduleCard() {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-xs text-foreground">
        <Clock className="size-3.5 text-brand" aria-hidden="true" />
        Every Monday · 8:00
      </div>
      <p className="text-xs text-muted-foreground">
        Weekly marketing report — pulls numbers and holds the draft for review.
      </p>
      <Badge variant="outline" className="w-fit text-[0.65rem]">
        Scheduled
      </Badge>
    </div>
  )
}

function ToolsScene() {
  return (
    <div className="grid content-start gap-2 p-4 sm:grid-cols-2">
      {heroStudio.tools.map((tool) => (
        <Card key={tool.name} size="sm" className="py-2.5">
          <CardHeader className="gap-1 px-3 pb-1">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="font-mono text-xs">{tool.name}</CardTitle>
              <Badge
                variant={tool.risk === "ask" ? "default" : "secondary"}
                className="text-[0.6rem]"
              >
                {tool.risk === "ask"
                  ? heroStudio.toolsUi.askBadge
                  : heroStudio.toolsUi.autoBadge}
              </Badge>
            </div>
            <CardDescription className="text-xs">{tool.detail}</CardDescription>
          </CardHeader>
          <CardFooter className="px-3 pt-1.5">
            {tool.risk === "ask" ? (
              <div className="flex gap-1.5">
                <Button size="xs">{heroStudio.toolsUi.allow}</Button>
                <Button size="xs" variant="outline">
                  {heroStudio.toolsUi.deny}
                </Button>
              </div>
            ) : (
              <span className="inline-flex items-center gap-1 text-[0.65rem] text-subtle-foreground">
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

function ComposerScene({
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
    <div className="flex flex-col gap-3 p-4">
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
      <div className="flex flex-wrap items-center gap-2">
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
      </div>
      <p className="text-center text-[0.65rem] text-subtle-foreground">
        {c.footer}
      </p>
    </div>
  )
}

function SessionsScene() {
  const { sidebar } = heroStudio
  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row">
      <div className="min-w-0 flex-1">
        <p className="mb-2 text-[0.65rem] eyebrow text-subtle-foreground">
          {sidebar.tasksLabel}
        </p>
        <ul className="flex flex-col gap-1">
          {sidebar.tasks.map((task) => (
            <li
              key={task.name}
              className={cn(
                "flex items-center gap-2 rounded-control px-2 py-1.5 text-xs",
                task.state === "running"
                  ? "bg-brand-muted font-medium text-brand"
                  : "text-muted-foreground"
              )}
            >
              {task.state === "running" ? (
                <Loader
                  className="size-3 motion-safe:animate-spin"
                  aria-hidden="true"
                />
              ) : task.state === "scheduled" ? (
                <Clock className="size-3" aria-hidden="true" />
              ) : (
                <Check className="size-3" aria-hidden="true" />
              )}
              <span className="truncate">{task.name}</span>
            </li>
          ))}
        </ul>
      </div>
      <Separator orientation="vertical" className="hidden sm:block" />
      <div className="sm:w-44">
        <p className="text-xs font-medium text-foreground">Runs unattended</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Scheduled tasks keep going with free models. You only see the finished
          draft.
        </p>
      </div>
    </div>
  )
}
