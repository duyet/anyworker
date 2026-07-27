import { createFileRoute } from "@tanstack/react-router"

import { Landing } from "@/components/landing/landing"

/** The chosen direction. Swapping the default is a one-word change here. */
export const Route = createFileRoute("/")({
  component: () => <Landing theme="studio" />,
})
