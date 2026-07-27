import { createFileRoute } from "@tanstack/react-router"

import { Landing } from "@/components/landing/landing"

/** Same page, same content — the "studio" direction. */
export const Route = createFileRoute("/d/studio")({
  component: () => <Landing theme="studio" />,
})
