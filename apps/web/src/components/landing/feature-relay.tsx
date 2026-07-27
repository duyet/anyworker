"use client"

import { useCallback, useEffect, useId, useState } from "react"
import {
  Check,
  ChevronDown,
  Clock,
  FolderOpen,
  Loader,
  Mic,
  PanelRight,
  Plus,
  Search,
  Send,
  Timer,
} from "lucide-react"

import { AnyWorkerMark } from "@/components/landing/wordmark"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { heroRelay, heroStudio } from "@/content/site"
import { cn } from "@/lib/utils"

type Phase = "waiting" | "approved" | "edited"
type SceneId = (typeof heroRelay.scenes)[number]["id"]

const STAGE_SRC: Record<"peaks" | "coast", string> = {
  peaks: "/brand/stage/peaks.webp",
  coast: "/brand/stage/coast.webp",
}

/**
 * OpenWorker-style full app shell on a painted stage.
 * Left sessions · center conversation · right progress / artifacts / access.
 */
export function FeatureRelay() {
  const scenes = heroRelay.scenes
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [phase, setPhase] = useState<Phase>("waiting")
  const [draft, setDraft] = useState("")
  const composerId = useId()
  const [reduceMotion, setReduceMotion] = useState(false)

  const scene = scenes[index]!
  const sceneId = scene.id

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
          className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-background/90"
          aria-hidden="true"
        />
      </div>

      <div className="relative flex min-h-[28rem] flex-col justify-end px-2 pb-5 pt-10 sm:min-h-[34rem] sm:px-5 sm:pb-7 sm:pt-12 lg:min-h-[38rem] lg:px-8">
        <div className="mx-auto w-full max-w-5xl">
          <AppShell
            sceneId={sceneId}
            phase={phase}
            onApprove={() => setPhase("approved")}
            onEdit={() => setPhase("edited")}
            draft={draft}
            setDraft={setDraft}
            composerId={composerId}
          />
        </div>

        <div className="relative z-20 mx-auto mt-4 flex w-full max-w-5xl flex-col items-center gap-2.5">
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

function AppShell({
  sceneId,
  phase,
  onApprove,
  onEdit,
  draft,
  setDraft,
  composerId,
}: {
  sceneId: SceneId
  phase: Phase
  onApprove: () => void
  onEdit: () => void
  draft: string
  setDraft: (v: string) => void
  composerId: string
}) {
  const s = heroStudio
  const showHome = sceneId === "home"
  const showAutomations = sceneId === "automations"
  const showAccessFocus = sceneId === "access"
  const showCheckin = sceneId === "checkin" || sceneId === "session"

  return (
    <div className="demo-window overflow-hidden rounded-[0.875rem] border text-left">
      {/* Title bar */}
      <div className="flex items-center gap-3 border-b border-border bg-surface px-3 py-2 sm:px-3.5">
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="size-2.5 rounded-pill bg-[#ff5f57]" />
          <span className="size-2.5 rounded-pill bg-[#febc2e]" />
          <span className="size-2.5 rounded-pill bg-[#28c840]" />
        </div>
        <div className="flex items-center gap-2">
          <AnyWorkerMark className="size-4 text-foreground" />
          <span className="text-xs font-semibold text-foreground">
            {s.appName}
          </span>
          <Badge
            variant="secondary"
            className="h-5 px-1.5 text-[0.6rem] font-medium uppercase tracking-wide"
          >
            {s.beta}
          </Badge>
        </div>
        {!showHome ? (
          <div className="ml-auto hidden min-w-0 flex-1 flex-col items-center px-4 sm:flex">
            <p className="max-w-xs truncate text-center text-xs font-medium text-foreground">
              {s.task.title}
            </p>
            <p className="text-[0.65rem] text-muted-foreground">{s.model}</p>
          </div>
        ) : (
          <div className="ml-auto" />
        )}
        <PanelRight
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
      </div>

      {/* Three panes */}
      <div className="flex h-[min(28rem,70vh)] min-h-[22rem] bg-surface">
        {/* Left sidebar */}
        <aside className="flex w-[11.5rem] shrink-0 flex-col border-r border-border bg-surface sm:w-52">
          <div className="flex flex-col gap-1 p-2.5">
            <Button
              size="sm"
              className="h-9 w-full justify-start gap-1.5 rounded-lg bg-[#4f6ef7] text-white hover:bg-[#3d5ce5]"
            >
              <Plus className="size-3.5" aria-hidden="true" />
              {s.newSession}
            </Button>
            <button
              type="button"
              className="flex h-8 items-center gap-2 rounded-lg px-2.5 text-xs text-muted-foreground hover:bg-muted"
            >
              <Search className="size-3.5" aria-hidden="true" />
              {s.search}
            </button>
            <button
              type="button"
              className={cn(
                "flex h-8 items-center gap-2 rounded-lg px-2.5 text-xs",
                showAutomations
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <Timer className="size-3.5" aria-hidden="true" />
              {s.automations}
            </button>
          </div>

          <div className="px-3 pb-1 pt-2">
            <p className="text-[0.6rem] font-medium uppercase tracking-wider text-subtle-foreground">
              {s.recent}
            </p>
          </div>
          <ul className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-2">
            {s.sidebar.sessions.map((session, i) => {
              const active =
                !showHome &&
                !showAutomations &&
                (i === 0 || session.state === "running")
              return (
                <li key={session.name}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs",
                      active
                        ? "bg-muted font-medium text-foreground"
                        : "text-muted-foreground hover:bg-muted/70"
                    )}
                  >
                    <SessionDot state={session.state} />
                    <span className="truncate">{session.name}</span>
                  </button>
                </li>
              )
            })}
          </ul>

          <div className="mt-auto flex items-center gap-2 border-t border-border px-3 py-2.5">
            <span className="flex size-6 items-center justify-center rounded-pill bg-muted text-[0.65rem] font-semibold text-foreground">
              {s.userName.slice(0, 1)}
            </span>
            <span className="truncate text-xs text-foreground">{s.userName}</span>
            <span
              className="ml-auto size-1.5 rounded-pill bg-emerald-500"
              aria-hidden="true"
            />
          </div>
        </aside>

        {/* Center */}
        <div className="flex min-w-0 flex-1 flex-col bg-[#f6f7f9] dark:bg-surface-muted">
          {showHome ? (
            <HomeCenter />
          ) : showAutomations ? (
            <AutomationsCenter />
          ) : (
            <SessionCenter
              phase={phase}
              onApprove={onApprove}
              onEdit={onEdit}
              showCheckin={showCheckin}
              draft={draft}
              setDraft={setDraft}
              composerId={composerId}
            />
          )}
        </div>

        {/* Right rail — hide on very small, show from sm */}
        <aside
          className={cn(
            "hidden w-48 shrink-0 flex-col border-l border-border bg-surface sm:flex lg:w-52",
            showAccessFocus && "ring-1 ring-inset ring-foreground/10"
          )}
        >
          <RightRail
            phase={phase}
            showAccessFocus={showAccessFocus}
            showArtifacts={sceneId === "session" || sceneId === "checkin"}
          />
        </aside>
      </div>
    </div>
  )
}

function SessionDot({ state }: { state: string }) {
  if (state === "running") {
    return (
      <Loader
        className="size-3 shrink-0 text-[#4f6ef7] motion-safe:animate-spin"
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
    <Check className="size-3 shrink-0 text-subtle-foreground" aria-hidden="true" />
  )
}

function SessionCenter({
  phase,
  onApprove,
  onEdit,
  showCheckin,
  draft,
  setDraft,
  composerId,
}: {
  phase: Phase
  onApprove: () => void
  onEdit: () => void
  showCheckin: boolean
  draft: string
  setDraft: (v: string) => void
  composerId: string
}) {
  const s = heroStudio
  const { task } = s

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4 sm:px-6">
        {/* User bubble */}
        <div className="mb-5 flex justify-center">
          <div className="max-w-[90%] rounded-2xl bg-white px-4 py-2.5 text-sm text-foreground shadow-sm ring-1 ring-black/5 dark:bg-surface dark:ring-white/10">
            {task.prompt}
          </div>
        </div>

        {/* Tool steps as progress narrative */}
        <ol className="mx-auto flex w-full max-w-md flex-col gap-2">
          {task.steps.map((step) => {
            const waiting = step.state === "waiting" && phase === "waiting"
            const done =
              step.state === "done" ||
              (step.state === "waiting" && phase !== "waiting")
            return (
              <li
                key={step.label}
                className="flex items-start gap-2.5 text-sm text-foreground"
              >
                {waiting ? (
                  <Loader
                    className="mt-0.5 size-3.5 shrink-0 text-[#4f6ef7] motion-safe:animate-spin"
                    aria-hidden="true"
                  />
                ) : done ? (
                  <Check
                    className="mt-0.5 size-3.5 shrink-0 text-emerald-600"
                    aria-hidden="true"
                  />
                ) : (
                  <span className="mt-1 size-2 shrink-0 rounded-pill border border-border" />
                )}
                <div className="min-w-0">
                  <span className={cn("font-medium", waiting && "text-[#4f6ef7]")}>
                    {step.label}
                  </span>
                  <span className="ml-1.5 text-muted-foreground">
                    {step.detail}
                  </span>
                  {step.tool ? (
                    <Badge
                      variant="outline"
                      className="ml-1.5 h-5 border-border bg-white font-mono text-[0.6rem] dark:bg-surface"
                    >
                      {step.tool}
                    </Badge>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ol>

        {showCheckin && phase === "waiting" ? (
          <div className="mx-auto mt-5 w-full max-w-md rounded-xl border border-border bg-white p-4 shadow-sm dark:bg-surface">
            <p className="text-sm font-semibold text-foreground">
              {s.approval.title}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{s.approval.body}</p>
            <p className="mt-3 rounded-lg bg-muted/80 px-3 py-2 text-xs leading-relaxed text-foreground">
              {s.approval.draftPreview}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                className="bg-[#4f6ef7] text-white hover:bg-[#3d5ce5]"
                onClick={onApprove}
              >
                {task.approveLabel}
              </Button>
              <Button size="sm" variant="outline" onClick={onEdit}>
                {task.editLabel}
              </Button>
            </div>
          </div>
        ) : null}

        {phase === "approved" ? (
          <p className="mx-auto mt-5 flex max-w-md items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
            <Check className="size-4 shrink-0" aria-hidden="true" />
            {s.approval.sent}
          </p>
        ) : null}
        {phase === "edited" ? (
          <p className="mx-auto mt-5 max-w-md rounded-xl border border-border bg-white px-3 py-2 text-sm text-muted-foreground dark:bg-surface">
            {s.approval.editNote}
          </p>
        ) : null}
      </div>

      <ComposerBar
        id={composerId}
        draft={draft}
        setDraft={setDraft}
      />
    </>
  )
}

function HomeCenter() {
  const h = heroStudio.home
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 overflow-y-auto px-4 py-8 sm:px-8">
      <div className="flex items-center gap-2.5">
        <span
          className="text-2xl text-[#c17b5c]"
          aria-hidden="true"
        >
          ✻
        </span>
        <h2 className="font-display text-2xl tracking-tight text-foreground sm:text-3xl">
          {h.greeting}
        </h2>
      </div>
      <p className="text-sm text-muted-foreground">{h.greetingSub}</p>

      <div className="w-full max-w-md rounded-2xl border border-border bg-white p-4 shadow-sm dark:bg-surface">
        <p className="text-sm text-muted-foreground">{h.helper}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" className="h-7 gap-1 rounded-full px-3 text-xs">
            <Plus className="size-3" aria-hidden="true" />
            Chat
          </Button>
          <Button
            size="sm"
            className="h-7 rounded-full bg-muted px-3 text-xs text-foreground hover:bg-muted/80"
            variant="secondary"
          >
            Cowork
          </Button>
          <span className="ml-auto text-[0.65rem] text-muted-foreground">
            {heroStudio.composer.modelPicker}
          </span>
        </div>
      </div>

      <div className="w-full max-w-md">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">
            {h.activeLabel}
          </p>
        </div>
        <ul className="flex flex-col gap-0.5">
          {h.active.map((item) => (
            <li key={item.name}>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-white/80 dark:hover:bg-surface"
              >
                <span className="size-1.5 shrink-0 rounded-pill bg-[#4f6ef7]" />
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                  {item.name}
                </span>
                <span className="shrink-0 text-[0.65rem] text-muted-foreground">
                  {item.when}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function AutomationsCenter() {
  const a = heroStudio.automationsPanel
  return (
    <div className="flex flex-1 flex-col overflow-y-auto px-4 py-5 sm:px-6">
      <h2 className="text-sm font-semibold text-foreground">{a.title}</h2>
      <ul className="mt-4 flex flex-col gap-2">
        {a.items.map((item) => (
          <li
            key={item.name}
            className="flex items-center gap-3 rounded-xl border border-border bg-white px-3 py-3 dark:bg-surface"
          >
            <Timer className="size-4 shrink-0 text-[#4f6ef7]" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {item.name}
              </p>
              <p className="text-xs text-muted-foreground">{item.when}</p>
            </div>
            <Badge
              variant={item.status === "On" ? "default" : "secondary"}
              className="text-[0.65rem]"
            >
              {item.status}
            </Badge>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ComposerBar({
  id,
  draft,
  setDraft,
}: {
  id: string
  draft: string
  setDraft: (v: string) => void
}) {
  const c = heroStudio.composer
  return (
    <div className="border-t border-border bg-[#f6f7f9] p-3 dark:bg-surface-muted sm:p-4">
      <div className="rounded-2xl border border-border bg-white px-3 py-2.5 shadow-sm dark:bg-surface">
        <label htmlFor={id} className="sr-only">
          {c.placeholder}
        </label>
        <input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={c.placeholder}
          className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            className="inline-flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
            aria-label="Add"
          >
            <Plus className="size-3.5" />
          </button>
          <button
            type="button"
            className="inline-flex h-7 items-center gap-1 rounded-full px-2 text-[0.7rem] text-muted-foreground hover:bg-muted"
          >
            {c.approvalMode}
            <ChevronDown className="size-3" aria-hidden="true" />
          </button>
          <span className="ml-auto text-[0.65rem] text-muted-foreground">
            {c.modelPicker}
          </span>
          <button
            type="button"
            className="inline-flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
            aria-label="Voice"
          >
            <Mic className="size-3.5" />
          </button>
          <button
            type="button"
            disabled={!draft.trim()}
            className="inline-flex size-7 items-center justify-center rounded-full bg-foreground text-background disabled:opacity-30"
            aria-label="Send"
            onClick={() => {
              if (draft.trim()) setDraft("")
            }}
          >
            <Send className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

function RightRail({
  phase,
  showAccessFocus,
  showArtifacts,
}: {
  phase: Phase
  showAccessFocus: boolean
  showArtifacts: boolean
}) {
  const s = heroStudio
  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <section className="border-b border-border p-3">
        <button
          type="button"
          className="flex w-full items-center justify-between text-left text-xs font-semibold text-foreground"
        >
          {s.progress.title}
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </button>
        <p className="mt-2 text-[0.7rem] leading-relaxed text-muted-foreground">
          {s.progress.body}
        </p>
        <ul className="mt-3 flex flex-col gap-1.5">
          {s.task.steps.map((step) => {
            const waiting = step.state === "waiting" && phase === "waiting"
            const done =
              step.state === "done" ||
              (step.state === "waiting" && phase !== "waiting")
            return (
              <li
                key={step.label}
                className="flex items-center gap-1.5 text-[0.7rem] text-muted-foreground"
              >
                {done ? (
                  <Check className="size-3 text-emerald-600" aria-hidden="true" />
                ) : waiting ? (
                  <Loader
                    className="size-3 text-[#4f6ef7] motion-safe:animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <span className="size-1.5 rounded-pill bg-border" />
                )}
                <span className="truncate">
                  {step.label} {step.detail}
                </span>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="border-b border-border p-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-foreground">
            {s.artifacts.title}
          </p>
        </div>
        {showArtifacts && phase !== "waiting" ? (
          <ul className="mt-2 flex flex-col gap-1">
            {s.artifacts.items.map((f) => (
              <li
                key={f.name}
                className="flex items-center gap-2 rounded-lg px-1.5 py-1 text-[0.7rem] text-foreground hover:bg-muted"
              >
                <FolderOpen
                  className="size-3 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <span className="truncate">{f.name}</span>
                <span className="ml-auto text-muted-foreground">{f.kind}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[0.7rem] text-muted-foreground">
            {s.artifacts.empty}
          </p>
        )}
      </section>

      <section
        className={cn(
          "p-3",
          showAccessFocus && "bg-muted/40"
        )}
      >
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-foreground">{s.access.title}</p>
        </div>
        <ul className="mt-2 flex flex-col gap-1">
          {s.access.items.map((item) => (
            <li
              key={item.name}
              className="flex items-center justify-between gap-2 py-0.5 text-[0.7rem]"
            >
              <span className="text-foreground">{item.name}</span>
              <span className="text-muted-foreground">{item.detail}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
