import { createFileRoute } from "@tanstack/react-router"

import { Landing } from "@/components/landing/landing"

/** Same page, same content — the "clarity" direction, kept for comparison. */
export const Route = createFileRoute("/d/clarity")({
  component: () => <Landing theme="clarity" />,
})
