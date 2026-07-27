import { createFileRoute } from "@tanstack/react-router"

import { Landing } from "@/components/landing/landing"

/** Production default: paper + painted stage (Cursor-style light product chrome). */
export const Route = createFileRoute("/")({
  component: () => <Landing theme="paper" />,
})
