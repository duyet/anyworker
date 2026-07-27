import { Check, ChevronRight, Clock, Loader } from "lucide-react"

import { Logo } from "@/components/landing/logos"
import { heroStudio } from "@/content/site"
import { cn } from "@/lib/utils"

/**
 * A depiction of the AnyWorker app window, shown in the hero.
 *
 * Deliberately static. Animating it would imply a live run is happening, and the
 * "Illustrative interface" caption exists so nobody has to guess. The only
 * motion is the status dot, which reads as UI chrome rather than as data.
 *
 * The sidebar is hidden below `sm`: at 375px it would either overflow or
 * squeeze the transcript into unreadable width, and the transcript is the part
 * that carries the argument.
 */
export function HeroStudio() {
  return (
    <figure className="mt-14 w-full max-w-4xl text-left">
      <div className="overflow-hidden rounded-card border border-border bg-surface shadow-lift">
        <TitleBar />
        <div className="flex">
          <Sidebar />
          <Transcript />
        </div>
      </div>
      <figcaption className="mt-3 text-center text-xs text-subtle-foreground">
        {heroStudio.caption}
      </figcaption>
    </figure>
  )
}

function TitleBar() {
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
      <span className="ml-auto inline-flex items-center gap-1.5 rounded-pill bg-brand-muted px-2.5 py-1 text-[0.7rem] font-medium text-brand">
        <span
          className="size-1.5 rounded-pill bg-brand motion-safe:animate-pulse"
          aria-hidden="true"
        />
        {heroStudio.statusLabel}
      </span>
    </div>
  )
}

function Sidebar() {
  const { sidebar } = heroStudio

  return (
    <div className="hidden w-52 shrink-0 flex-col gap-5 border-r border-border bg-surface-muted p-4 sm:flex">
      <div>
        <p className="mb-2.5 text-[0.65rem] eyebrow text-subtle-foreground">
          {sidebar.tasksLabel}
        </p>
        <ul className="flex flex-col gap-0.5">
          {sidebar.tasks.map((task) => (
            <li
              key={task.name}
              className={cn(
                "flex items-center gap-2 rounded-control px-2 py-1.5 text-xs",
                task.state === "running"
                  ? "bg-surface font-medium text-foreground"
                  : "text-muted-foreground"
              )}
            >
              <TaskDot state={task.state} />
              <span className="truncate">{task.name}</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="mb-2.5 text-[0.65rem] eyebrow text-subtle-foreground">
          {sidebar.connectionsLabel}
        </p>
        <ul className="flex flex-col gap-2">
          {sidebar.connections.map((c) => (
            <li
              key={c.name}
              className="flex items-center gap-2 px-2 text-xs text-muted-foreground"
            >
              <span aria-hidden="true" className="flex shrink-0">
                <Logo name={c.logo} className="size-4" />
              </span>
              {c.name}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
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

function Transcript() {
  const { task } = heroStudio

  return (
    <div className="min-w-0 flex-1">
      <div className="border-b border-border px-5 py-3">
        <p className="truncate text-sm font-medium text-foreground">
          {task.title}
        </p>
        <p className="mt-0.5 truncate font-mono text-[0.7rem] text-subtle-foreground">
          {task.meta}
        </p>
      </div>

      <div className="flex flex-col gap-4 p-5">
        {/* The ask */}
        <div className="self-end rounded-card rounded-br-sm bg-brand-muted px-4 py-2.5">
          <p className="text-sm text-brand">{task.prompt}</p>
        </div>

        {/* What it did */}
        <ol className="flex flex-col gap-2.5">
          {task.steps.map((step) => {
            const waiting = step.state === "waiting"

            return (
              <li key={step.label} className="flex items-start gap-2.5">
                <StepIcon waiting={waiting} />
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
                    <span className="rounded-pill border border-border px-2 py-0.5 font-mono text-[0.65rem] text-subtle-foreground">
                      {step.tool}
                    </span>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ol>

        {/* The brake: this is the point of the whole panel */}
        <div className="rounded-card border border-border bg-surface-muted p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-control bg-brand px-3 py-1.5 text-xs font-medium text-brand-foreground">
              {task.approveLabel}
              <ChevronRight className="size-3" aria-hidden="true" />
            </span>
            <span className="rounded-control border border-border-strong bg-surface px-3 py-1.5 text-xs font-medium text-foreground">
              {task.editLabel}
            </span>
            <span className="ml-auto text-[0.7rem] text-subtle-foreground">
              {task.checkInNote}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function StepIcon({ waiting }: { waiting: boolean }) {
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

  return (
    <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-pill bg-brand text-brand-foreground">
      <Check className="size-2.5" aria-hidden="true" />
    </span>
  )
}
