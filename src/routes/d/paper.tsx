import { createFileRoute } from "@tanstack/react-router"

import { Landing } from "@/components/landing/landing"

/** Same page, same content — the "paper" direction. */
export const Route = createFileRoute("/d/paper")({
  component: () => <Landing theme="paper" />,
})
