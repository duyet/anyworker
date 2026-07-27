import { createFileRoute } from "@tanstack/react-router"

import { Landing } from "@/components/landing/landing"

/** The default direction. Promoting another variant to / is a one-word change. */
export const Route = createFileRoute("/")({
  component: () => <Landing theme="clarity" />,
})
