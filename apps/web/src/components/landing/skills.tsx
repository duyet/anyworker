"use client"

import { useCallback, useState } from "react"
import {
  Check,
  ChevronDown,
  FileSearch,
  FlaskConical,
  FolderOpen,
  Landmark,
  Loader,
  PanelRight,
  Search,
  Timer,
} from "lucide-react"

import { AnyWorkerMark } from "@/components/landing/wordmark"
import { Container, Eyebrow, Headline } from "@/components/landing/primitives"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { skills, USE_CASES } from "@/content/site"
import type { UseCaseDef, UseCaseId } from "@/content/site"
import { cn } from "@/lib/utils"

const USE_CASE_ICONS: Record<string, React.ReactNode> = {
  FileSearch: <FileSearch className="size-4" />,
  Landmark: <Landmark className="size-4" />,
  Search: <Search className="size-4" />,
  FlaskConical: <FlaskConical className="size-4" />,
}

/**
 * Use-case tab picker + live app demo.
 *
 * Merged into the hero: the hero shows the headline and CTAs, then this
 * component renders the use-case tabs with the running app shell replaying
 * the selected workflow's steps, artifacts, and results.
 */
export function UseCaseDemo() {
  const [activeId, setActiveId] = useState<UseCaseId>("rag")
  const u = USE_CASES.find((c) => c.id === activeId) ?? USE_CASES[0]
  const [phase, setPhase] = useState<"waiting" | "approved">("waiting")

  const switchTo = useCallback((id: UseCaseId) => {
    setActiveId(id)
    setPhase("waiting")
  }, [])

  return (
    <div className="w-full">
      {/* Tab-based use-case picker */}
      <Tabs
        value={activeId}
        onValueChange={(v) => switchTo(v as UseCaseId)}
        className="w-full"
      >
        <TabsList
          variant="line"
          className="mx-auto mb-6 flex-wrap justify-center gap-2"
        >
          {USE_CASES.map((uc) => (
            <TabsTrigger key={uc.id} value={uc.id} className="flex items-center gap-1.5">
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-lg",
                  activeId === uc.id
                    ? "bg-brand text-brand-foreground"
                    : "bg-brand/10 text-brand",
                )}
              >
                {USE_CASE_ICONS[uc.icon]}
              </span>
              {uc.title}
              <Badge variant="outline" className="text-[10px] px-1.5">
                {uc.badge}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Live app demo replaying running results */}
      <div className="mx-auto max-w-5xl overflow-hidden rounded-[0.875rem] border">
        <AppDemo useCase={u} phase={phase} onApprove={() => setPhase("approved")} />
      </div>
    </div>
  )
}

/**
 * Standalone Skills section — kept below the hero for the full-page
 * use-case gallery. Renders the same demo but with section chrome.
 */
export function Skills() {
  const [activeId, setActiveId] = useState<UseCaseId>("rag")
  const u = USE_CASES.find((c) => c.id === activeId) ?? USE_CASES[0]
  const [phase, setPhase] = useState<"waiting" | "approved">("waiting")

  const switchTo = useCallback((id: UseCaseId) => {
    setActiveId(id)
    setPhase("waiting")
  }, [])

  return (
    <section id="skills" className="scroll-mt-20 border-t border-border py-20 sm:py-28">
      <Container>
        <div className="mb-10 flex flex-col gap-5">
          <Eyebrow>{skills.eyebrow}</Eyebrow>
          <Headline lines={skills.headline} size="lg" />
          <p className="max-w-2xl text-lg leading-relaxed text-pretty text-muted-foreground">
            {skills.body}
          </p>
        </div>

        {/* Two-panel interactive demo */}
        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          {/* Left: App window */}
          <div className="overflow-hidden rounded-[0.875rem] border text-left">
            <AppDemo useCase={u} phase={phase} onApprove={() => setPhase("approved")} />
          </div>

          {/* Right: Use case picker */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Use cases
            </p>
            {USE_CASES.map((uc) => (
              <button
                key={uc.id}
                type="button"
                onClick={() => switchTo(uc.id)}
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-3.5 text-left transition-all",
                  activeId === uc.id
                    ? "border-brand/50 bg-brand/5 ring-1 ring-brand/20"
                    : "border-border/60 bg-surface hover:border-border hover:bg-surface-muted",
                )}
              >
                <div
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg",
                    activeId === uc.id
                      ? "bg-brand text-brand-foreground"
                      : "bg-brand/10 text-brand",
                  )}
                >
                  {USE_CASE_ICONS[uc.icon]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{uc.title}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5">
                      {uc.badge}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground line-clamp-2">
                    {uc.prompt}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </Container>
    </section>
  )
}

function AppDemo({
  useCase,
  phase,
  onApprove,
}: {
  useCase: UseCaseDef
  phase: "waiting" | "approved"
  onApprove: () => void
}) {
  const stepDone = (i: number) =>
    i < useCase.steps.length - 1 || (i === useCase.steps.length - 1 && phase !== "waiting")

  return (
    <div className="demo-window text-left">
      {/* Title bar */}
      <div className="flex items-center gap-3 border-b border-border bg-surface px-3 py-2 sm:px-3.5">
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-[#ff5f57]" />
          <span className="size-2.5 rounded-full bg-[#febc2e]" />
          <span className="size-2.5 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex items-center gap-2">
          <AnyWorkerMark className="size-4" colored />
          <span className="text-xs font-semibold text-foreground">AnyWorker</span>
          <Badge variant="secondary" className="h-5 px-1.5 text-[0.6rem] font-medium uppercase tracking-wide">
            Beta
          </Badge>
        </div>
        <div className="ml-auto hidden min-w-0 flex-1 flex-col items-center px-4 sm:flex">
          <p className="max-w-xs truncate text-center text-xs font-medium text-foreground">
            {useCase.appTitle}
          </p>
          <p className="text-[0.65rem] text-muted-foreground">{useCase.appModel}</p>
        </div>
        <PanelRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </div>

      {/* Three panes */}
      <div className="flex h-[min(28rem,70vh)] min-h-[24rem] bg-surface">
        {/* Left sidebar */}
        <aside className="flex w-[11.5rem] shrink-0 flex-col border-r border-border bg-surface sm:w-48">
          <div className="flex flex-col gap-1 p-2.5">
            <Button size="sm" className="h-9 w-full justify-start gap-1.5 rounded-lg bg-[#4f6ef7] text-white hover:bg-[#3d5ce5]">
              + New session
            </Button>
          </div>
          <div className="px-3 pb-1 pt-2">
            <p className="text-[0.6rem] font-medium uppercase tracking-wider text-muted-foreground">
              Recent
            </p>
          </div>
          <ul className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-2">
            {useCase.sidebarSessions.map((s) => (
              <li key={s.name}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs",
                    s.state === "running"
                      ? "bg-muted font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted/70",
                  )}
                >
                  {s.state === "running" ? (
                    <Loader className="size-3 shrink-0 text-[#4f6ef7] motion-safe:animate-spin" />
                  ) : s.state === "scheduled" ? (
                    <Timer className="size-3 shrink-0 text-muted-foreground" />
                  ) : (
                    <Check className="size-3 shrink-0 text-muted-foreground" />
                  )}
                  <span className="truncate">{s.name}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-auto flex items-center gap-2 border-t border-border px-3 py-2.5">
            <span className="flex size-6 items-center justify-center rounded-full bg-muted text-[0.65rem] font-semibold text-foreground">
              Y
            </span>
            <span className="truncate text-xs text-foreground">You</span>
            <span className="ml-auto size-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
          </div>
        </aside>

        {/* Center conversation */}
        <div className="flex min-w-0 flex-1 flex-col bg-[#f6f7f9] dark:bg-surface-muted">
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4 sm:px-6">
            {/* User prompt */}
            <div className="mb-5 flex justify-center">
              <div className="max-w-[90%] rounded-2xl bg-white px-4 py-2.5 text-sm text-foreground shadow-sm ring-1 ring-black/5 dark:bg-surface dark:ring-white/10">
                {useCase.prompt}
              </div>
            </div>

            {/* Tool steps as progress narrative with tool rendering */}
            <ol className="mx-auto flex w-full max-w-md flex-col gap-2">
              {useCase.steps.map((step, i) => {
                const done = stepDone(i)
                const waiting = !done && phase === "waiting"
                return (
                  <li key={step.label} className="flex items-start gap-2.5 text-sm text-foreground">
                    {waiting ? (
                      <Loader className="mt-0.5 size-3.5 shrink-0 text-[#4f6ef7] motion-safe:animate-spin" />
                    ) : done ? (
                      <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
                    ) : (
                      <span className="mt-1 size-2 shrink-0 rounded-full border border-border" />
                    )}
                    <div className="min-w-0">
                      <span className={cn("font-medium", waiting && "text-[#4f6ef7]")}>
                        {step.label}
                      </span>
                      <span className="ml-1.5 text-muted-foreground">{step.detail}</span>
                      {step.tool ? (
                        <Badge variant="outline" className="ml-1.5 h-5 border-border bg-white font-mono text-[0.6rem] dark:bg-surface">
                          {step.tool}
                        </Badge>
                      ) : null}
                    </div>
                  </li>
                )
              })}
            </ol>

            {/* Reasoning block (shows when approved) */}
            {phase === "approved" ? (
              <div className="mx-auto mt-5 w-full max-w-md rounded-xl border border-border bg-white p-4 shadow-sm dark:bg-surface">
                <p className="text-sm font-semibold text-foreground">Reasoning</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Analyzing the indexed files for patterns. Found 47 source files, extracted PDF/xlsx/csv content, built a local vector index, and identified key WebSocket and session management patterns.
                </p>
              </div>
            ) : null}

            {/* Approval card */}
            {phase === "waiting" ? (
              <div className="mx-auto mt-5 w-full max-w-md rounded-xl border border-border bg-white p-4 shadow-sm dark:bg-surface">
                <p className="text-sm font-semibold text-foreground">Approval required</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Review what AnyWorker found before it proceeds.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" className="bg-[#4f6ef7] text-white hover:bg-[#3d5ce5]" onClick={onApprove}>
                    Approve
                  </Button>
                  <Button size="sm" variant="outline">
                    Edit
                  </Button>
                </div>
              </div>
            ) : null}

            {phase === "approved" ? (
              <p className="mx-auto mt-5 flex max-w-md items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                <Check className="size-4 shrink-0" />
                Done. Results in artifacts.
              </p>
            ) : null}
          </div>
        </div>

        {/* Right rail */}
        <aside className="hidden w-44 shrink-0 flex-col border-l border-border bg-surface sm:flex lg:w-48">
          <div className="flex flex-1 flex-col overflow-y-auto">
            <section className="border-b border-border p-3">
              <button
                type="button"
                className="flex w-full items-center justify-between text-left text-xs font-semibold text-foreground"
              >
                Progress <ChevronDown className="size-3.5 text-muted-foreground" />
              </button>
              <p className="mt-2 text-[0.7rem] leading-relaxed text-muted-foreground">
                {useCase.progressBody}
              </p>
            </section>
            <section className="border-b border-border p-3">
              <p className="text-xs font-semibold text-foreground">Artifacts</p>
              {phase === "approved" ? (
                <ul className="mt-2 flex flex-col gap-1">
                  {useCase.artifacts.map((f) => (
                    <li
                      key={f.name}
                      className="flex items-center gap-2 rounded-lg px-1.5 py-1 text-[0.7rem] text-foreground hover:bg-muted"
                    >
                      <FolderOpen className="size-3 shrink-0 text-muted-foreground" />
                      <span className="truncate">{f.name}</span>
                      <span className="ml-auto text-muted-foreground">{f.kind}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-[0.7rem] text-muted-foreground">No files yet.</p>
              )}
            </section>
            <section className="p-3">
              <p className="text-xs font-semibold text-foreground">Access</p>
              <ul className="mt-2 flex flex-col gap-1">
                {useCase.accessItems.map((item) => (
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
        </aside>
      </div>
    </div>
  )
}
